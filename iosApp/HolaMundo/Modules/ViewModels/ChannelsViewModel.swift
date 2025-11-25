import SwiftUI

class ChannelsViewModel: ObservableObject {
    @Published var channels: [Channel] = []
    @Published var favorites: [Channel] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    private var lastPublicLoadAt: Date?
    private var lastSubscribedLoadAt: Date?
    private let minReloadInterval: TimeInterval = 10

    init() {
        if let cachedChannels = PersistenceManager.shared.loadChannels() {
            self.channels = cachedChannels
        }
    }
    
    func loadChannels(isRefresh: Bool = false, publicOnly: Bool = false) {
        if isRefresh {
            isRefreshing = true
        } else {
            isLoading = channels.isEmpty
        }
        
        if !isRefresh {
            if publicOnly, let last = lastPublicLoadAt, Date().timeIntervalSince(last) < minReloadInterval {
                errorMessage = nil
                isLoading = false
                return
            }
            if !publicOnly, let last = lastSubscribedLoadAt, Date().timeIntervalSince(last) < minReloadInterval {
                errorMessage = nil
                isLoading = false
                return
            }
        }
        
        errorMessage = nil
        
        let base = "\(APIConfig.baseURL)/channels"
        let urlStr = publicOnly ? "\(base)?isPublic=true" : "\(base)?userId=\(UserSession.shared.currentUserId)"
        guard let url = URL(string: urlStr) else {
            errorMessage = "URL inválida"
            isLoading = false
            isRefreshing = false
            return
        }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                self?.isRefreshing = false
                
                if let error = error {
                    if self?.channels.isEmpty ?? true {
                        self?.errorMessage = "Error de conexión: \(error.localizedDescription)"
                    }
                    return
                }
                
                guard let data = data else {
                    if self?.channels.isEmpty ?? true {
                        self?.errorMessage = "No se recibieron datos"
                    }
                    return
                }
                
                do {
                    let decoder = JSONDecoder()
                    let newChannels = try decoder.decode([Channel].self, from: data)
                    self?.channels = newChannels
                    if publicOnly { self?.lastPublicLoadAt = Date() } else { self?.lastSubscribedLoadAt = Date() }
                    PersistenceManager.shared.saveChannels(newChannels)
                } catch {
                    if self?.channels.isEmpty ?? true {
                        self?.errorMessage = "Lo sentimos, te invitamos a cerrar la app y volver a abrirla. Lamentamos de todo corazón las molestias."
                    }
                    print("Error detallado: \(error)")
                }
            }
        }.resume()
    }

    func loadSubscribedChannels(isRefresh: Bool = false) {
        if isRefresh { isRefreshing = true } else { isLoading = channels.isEmpty }
        errorMessage = nil
        Task {
            let subs = await fetchSubscribedChannels()
            let ids = Set(subs.map { $0.id })
            channels = channels.map { c in
                Channel(
                    id: c.id,
                    title: c.title,
                    description: c.description,
                    icon: c.icon,
                    memberCount: c.memberCount,
                    parentId: c.parentId,
                    isPublic: c.isPublic,
                    isSubscribed: ids.contains(c.id),
                    isFavorite: c.isFavorite,
                    last24hCount: c.last24hCount,
                    subchannels: c.subchannels
                )
            }
            favorites = channels.filter { ($0.isFavorite ?? false) }
            isLoading = false
            isRefreshing = false
            lastSubscribedLoadAt = Date()
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "cache_channels_subs_ts")
        }
    }

    func loadFavorites() {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/user/\(UserSession.shared.currentUserId)/subscribed") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self?.favorites = items.filter { ($0.isFavorite ?? false) && $0.parentId == nil }
                }
            }
        }.resume()
    }

    func toggleFavorite(channelId: String, makeFavorite: Bool) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions/preferences/favorite") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userId": UserSession.shared.currentUserId,
            "channelId": channelId,
            "isFavorite": makeFavorite
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                    if let idx = self?.channels.firstIndex(where: { $0.id == channelId }) {
                        var c = self!.channels[idx]
                        c = Channel(id: c.id, title: c.title, description: c.description, icon: c.icon, memberCount: c.memberCount, parentId: c.parentId, isPublic: c.isPublic, isSubscribed: c.isSubscribed, isFavorite: makeFavorite, last24hCount: c.last24hCount, subchannels: c.subchannels)
                        self?.channels[idx] = c
                    }
                    self?.loadFavorites()
                }
            }
        }.resume()
    }

    func unsubscribe(channelId: String, completion: @escaping (Bool)->Void) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userId": UserSession.shared.currentUserId,
            "channelId": channelId
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { [weak self] _, response, error in
            DispatchQueue.main.async {
                let ok = (error == nil) && (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
                if ok { self?.loadSubscribedChannels(isRefresh: true) }
                completion(ok)
            }
        }.resume()
    }

    func subscribe(channelId: String, completion: @escaping (Bool)->Void) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["userId": UserSession.shared.currentUserId, "channelId": channelId]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let http = response as? HTTPURLResponse, http.statusCode == 403,
                   let data = data,
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   (obj["code"] as? String) == "USER_DISABLED" {
                    self?.errorMessage = "Tu cuenta está deshabilitada. Contacta al administrador."
                    completion(false)
                    return
                }
                let ok = (error == nil) && (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
                if ok { self?.loadSubscribedChannels(isRefresh: true) }
                completion(ok)
            }
        }.resume()
    }

    func canGuestSubscribe(completion: @escaping (Bool)->Void) {
        if UserSession.shared.isVerified { completion(true); return }
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") else { completion(false); return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                let count = (try? JSONDecoder().decode([Subscription].self, from: data ?? Data()))?.count ?? 0
                completion(count < 1)
            }
        }.resume()
    }

    private func fetchChannels(publicOnly: Bool) async -> [Channel] {
        let base = "\(APIConfig.baseURL)/channels"
        let urlStr = publicOnly ? "\(base)?isPublic=true" : "\(base)?userId=\(UserSession.shared.currentUserId)"
        guard let url = URL(string: urlStr) else { return [] }
        do {
            let (data, res) = try await URLSession.shared.data(from: url)
            guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
            return try JSONDecoder().decode([Channel].self, from: data)
        } catch { return [] }
    }

    private func fetchSubscribedChannels() async -> [Channel] {
        guard !UserSession.shared.currentUserId.isEmpty,
              let url = URL(string: "\(APIConfig.baseURL)/channels/user/\(UserSession.shared.currentUserId)/subscribed") else { return [] }
        var req = URLRequest(url: url)
        if let tok = UserSession.shared.token { req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization") }
        do {
            let (data, res) = try await URLSession.shared.data(for: req)
            guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
            let items = try JSONDecoder().decode([Channel].self, from: data)
            return items
        } catch { return [] }
    }
}
