
import SwiftUI

class ChannelDetailViewModel: ObservableObject {
    @Published var channelDetail: ChannelDetail?
    @Published var activeSubchannelDetail: ChannelDetail?
    @Published var isPrimarySubchannel: Bool = false
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var showCompose = false
    @Published var showPasswordPrompt = false
    @Published var passwordInput = ""
    @Published var passwordValidationResult: Bool?
    
    func loadChannelDetail(channelId: String, isRefresh: Bool = false) {
        if channelDetail == nil {
            if let cachedDetail = PersistenceManager.shared.loadChannelDetail(id: channelId) {
                self.channelDetail = cachedDetail
            }
        }
        
        if isRefresh {
            isRefreshing = true
        } else {
            isLoading = channelDetail == nil
        }
        
        errorMessage = nil
        
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/\(channelId)?userId=\(UserSession.shared.currentUserId)") else {
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
                    if self?.channelDetail == nil {
                        self?.errorMessage = "Error de conexión: \(error.localizedDescription)"
                    }
                    return
                }
                
                guard let data = data else {
                    if self?.channelDetail == nil {
                        self?.errorMessage = "No se recibieron datos"
                    }
                    return
                }
                
                do {
                    let decoder = JSONDecoder()
                    let newDetail = try decoder.decode(ChannelDetail.self, from: data)
                    self?.channelDetail = newDetail
                    PersistenceManager.shared.saveChannelDetail(newDetail)

                    self?.isPrimarySubchannel = false
                    if let parentId = newDetail.parentId {
                        if let channels = PersistenceManager.shared.loadChannels(),
                           let parent = channels.first(where: { $0.id == parentId }),
                           let subs = parent.subchannels,
                           let defaultId = subs.sorted(by: { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }).first?.id {
                            self?.isPrimarySubchannel = (newDetail.id == defaultId)
                        }
                    } else if let subs = newDetail.subchannels, !subs.isEmpty {
                        let defaultSub = subs.sorted(by: { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }).first
                        if let sub = defaultSub { self?.loadSubchannelDetail(sub.id) }
                    }
                } catch {
                    if self?.channelDetail == nil {
                        self?.errorMessage = "Lo sentimos, te invitamos a cerrar la app y volver a abrirla. Lamentamos de todo corazón las molestias."
                    }
                    print("Error detallado: \(error)")
                }
            }
        }.resume()
    }

    private func loadSubchannelDetail(_ subId: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/\(subId)?userId=\(UserSession.shared.currentUserId)") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let data = data, let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) else { return }
                self?.activeSubchannelDetail = detail
                PersistenceManager.shared.saveChannelDetail(detail)
            }
        }.resume()
    }

    func validatePassword(channelId: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/\(channelId)/validate-password") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["password": passwordInput]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let data = data else { self?.passwordValidationResult = false; return }
                if let res = try? JSONDecoder().decode(PasswordValidation.self, from: data) {
                    self?.passwordValidationResult = res.valid
                } else {
                    self?.passwordValidationResult = false
                }
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
                if error == nil, let http = response as? HTTPURLResponse, http.statusCode == 201 {
                    self?.loadChannelDetail(channelId: channelId, isRefresh: true)
                    completion(true)
                } else {
                    completion(false)
                }
            }
        }.resume()
    }

    func unsubscribe(channelId: String, completion: @escaping (Bool)->Void) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["userId": UserSession.shared.currentUserId, "channelId": channelId]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if error == nil, let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                    self?.loadChannelDetail(channelId: channelId, isRefresh: true)
                    completion(true)
                } else {
                    completion(false)
                }
            }
        }.resume()
    }
}
