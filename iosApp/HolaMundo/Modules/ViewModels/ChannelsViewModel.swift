import SwiftUI

class ChannelsViewModel: ObservableObject {
    @Published var channels: [Channel] = []
    @Published var favorites: [Channel] = []
    @Published var myChannels: [Channel] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    @Published var subscribedChannelsCount: Int = 0
    @Published var messagesCount: Int = 0
    @Published var ownedChannelsCount: Int = 0
    private var bootstrapTask: Task<Void, Never>? = nil
    private var lastPublicLoadAt: Date?
    private var lastSubscribedLoadAt: Date?
    private let minReloadInterval: TimeInterval = 10
    private var channelsTask: Task<Void, Never>? = nil
    private var subsTask: Task<Void, Never>? = nil
    private var favoritesTask: Task<Void, Never>? = nil
    private var prefTask: Task<Void, Never>? = nil
    private var subscribeTask: Task<Void, Never>? = nil
    private var unsubscribeTask: Task<Void, Never>? = nil
    private var detailsPrefetchTask: Task<Void, Never>? = nil

    init() {
        if let cachedChannels = PersistenceManager.shared.loadChannels() {
            self.channels = cachedChannels
        }
        if let cachedMy = PersistenceManager.shared.loadMyChannels() {
            self.myChannels = cachedMy
        }
    }
    
    func loadChannels(isRefresh: Bool = false, publicOnly: Bool = false) {
        channelsTask?.cancel()
        if isRefresh { isRefreshing = true } else { isLoading = channels.isEmpty }
        errorMessage = nil
        let base = "\(APIConfig.baseURL)/channels"
        let urlStr = publicOnly ? "\(base)?isPublic=true" : "\(base)?userId=\(UserSession.shared.currentUserId)"
        guard let url = URL(string: urlStr) else { errorMessage = "URL inválida"; isLoading = false; isRefreshing = false; return }
        channelsTask = Task { [weak self] in
            do {
                var req = URLRequest(url: url)
                req.setValue(UserSession.shared.currentUserId, forHTTPHeaderField: "X-User-Id")
                let (data, res) = try await URLSession.shared.data(for: req)
                let ok = (res as? HTTPURLResponse)?.statusCode == 200
                if !ok { throw URLError(.badServerResponse) }
                let items = (try? JSONDecoder().decode([Channel].self, from: data)) ?? []
                await MainActor.run {
                    self?.channels = items
                    if publicOnly { self?.lastPublicLoadAt = Date() } else { self?.lastSubscribedLoadAt = Date() }
                    self?.isLoading = false
                    self?.isRefreshing = false
                    PersistenceManager.shared.saveChannels(items)
                }
                self?.prefetchChannelDetails(for: items)
            } catch {
                await MainActor.run { [weak self] in
                    if self?.channels.isEmpty ?? true { self?.errorMessage = "Error de conexión" }
                    self?.isLoading = false
                    self?.isRefreshing = false
                }
            }
        }
    }

    func loadBootstrap() {
        bootstrapTask?.cancel()
        isLoading = channels.isEmpty
        errorMessage = nil
        guard let url = URL(string: "\(APIConfig.baseURL)/app/bootstrap?userId=\(UserSession.shared.currentUserId)") else { isLoading = false; return }
        bootstrapTask = Task { [weak self] in
            do {
                let (data, res) = try await URLSession.shared.data(from: url)
                let status = (res as? HTTPURLResponse)?.statusCode ?? 0
                if status == 304 {
                    await MainActor.run { self?.isLoading = false }
                    return
                }
                guard status == 200 else { return }
                let objAny = try JSONSerialization.jsonObject(with: data)
                guard let obj = objAny as? [String: Any] else { return }
                var items: [Channel] = []
                var favs: [Channel] = []
                var mine: [Channel] = []
                var sc = 0, mc = 0, oc = 0
                if let chData = obj["channels"], let chJSON = try? JSONSerialization.data(withJSONObject: chData) {
                    items = (try? JSONDecoder().decode([Channel].self, from: chJSON)) ?? []
                }
                if let favData = obj["favorites"], let favJSON = try? JSONSerialization.data(withJSONObject: favData) {
                    favs = (try? JSONDecoder().decode([Channel].self, from: favJSON)) ?? []
                }
                if let myData = obj["myChannels"], let myJSON = try? JSONSerialization.data(withJSONObject: myData) {
                    mine = (try? JSONDecoder().decode([Channel].self, from: myJSON)) ?? []
                }
                if let stats = obj["stats"] as? [String: Any] {
                    sc = stats["subscribedChannelsCount"] as? Int ?? 0
                    mc = stats["messagesCount"] as? Int ?? 0
                    oc = stats["ownedChannelsCount"] as? Int ?? 0
                }
                await MainActor.run {
                    self?.channels = items
                    self?.favorites = favs
                    let old = self?.myChannels ?? []
                    let a = old.sorted { $0.id < $1.id }
                    let b = mine.sorted { $0.id < $1.id }
                    if a != b {
                        self?.myChannels = mine
                        PersistenceManager.shared.saveMyChannels(mine)
                    }
                    self?.subscribedChannelsCount = sc
                    self?.messagesCount = mc
                    self?.ownedChannelsCount = oc
                    self?.isLoading = false
                    PersistenceManager.shared.saveChannels(items)
                }
                var merged: [Channel] = []
                merged.append(contentsOf: mine)
                merged.append(contentsOf: favs)
                merged.append(contentsOf: items)
            } catch {
                await MainActor.run { [weak self] in
                    self?.isLoading = false
                    let hasCached = !(self?.channels.isEmpty ?? true) || !(self?.myChannels.isEmpty ?? true)
                    if !hasCached { self?.errorMessage = "Error de conexión" } else { self?.errorMessage = nil }
                }
            }
        }
    }

    func loadSubscribedChannels(isRefresh: Bool = false) {
        subsTask?.cancel()
        if isRefresh { isRefreshing = true } else { isLoading = channels.isEmpty }
        errorMessage = nil
        subsTask = Task { [weak self] in
            let subs = await self?.fetchSubscribedChannels() ?? []
            let ids = Set(subs.map { $0.id })
            await MainActor.run {
                guard let self = self else { return }
                self.channels = self.channels.map { c in
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
                        subchannels: c.subchannels,
                        lastMessagePreview: c.lastMessagePreview,
                        lastMessageAt: c.lastMessageAt,
                        unreadCount: c.unreadCount
                    )
                }
                self.favorites = self.channels.filter { ($0.isFavorite ?? false) }
                self.isLoading = false
                self.isRefreshing = false
                self.lastSubscribedLoadAt = Date()
                UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "cache_channels_subs_ts")
            }
            let subscribed = subs
            self?.prefetchChannelDetails(for: subscribed, limit: subscribed.count)
        }
    }

    func loadFavorites() {
        favoritesTask?.cancel()
        favoritesTask = Task { [weak self] in
            let items = await self?.fetchSubscribedChannels() ?? []
            await MainActor.run {
                self?.favorites = items.filter { ($0.isFavorite ?? false) && $0.parentId == nil }
            }
            let favs = items.filter { ($0.isFavorite ?? false) }
            self?.prefetchChannelDetails(for: favs, limit: favs.count)
        }
    }

    func toggleFavorite(channelId: String, makeFavorite: Bool) {
        prefTask?.cancel()
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
        prefTask = Task { [weak self] in
            do {
                let (_, response) = try await URLSession.shared.data(for: req)
                guard (response as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? false else { return }
                await MainActor.run {
                    if let idx = self?.channels.firstIndex(where: { $0.id == channelId }), let c0 = self?.channels[idx] {
                        let c = Channel(
                            id: c0.id,
                            title: c0.title,
                            description: c0.description,
                            icon: c0.icon,
                            memberCount: c0.memberCount,
                            parentId: c0.parentId,
                            isPublic: c0.isPublic,
                            isSubscribed: c0.isSubscribed,
                            isFavorite: makeFavorite,
                            last24hCount: c0.last24hCount,
                            subchannels: c0.subchannels,
                            lastMessagePreview: c0.lastMessagePreview,
                            lastMessageAt: c0.lastMessageAt,
                            unreadCount: c0.unreadCount
                        )
                        self?.channels[idx] = c
                    }
                }
                self?.loadFavorites()
            } catch { /* silencioso */ }
        }
    }

    func unsubscribe(channelId: String, completion: @escaping (Bool)->Void) {
        unsubscribeTask?.cancel()
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "userId": UserSession.shared.currentUserId,
            "channelId": channelId
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        unsubscribeTask = Task { [weak self] in
            do {
                let (_, response) = try await URLSession.shared.data(for: req)
                let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
                await MainActor.run {
                    if ok {
                        self?.loadSubscribedChannels(isRefresh: true)
                        self?.loadBootstrap()
                    }
                    completion(ok)
                }
            } catch {
                await MainActor.run { completion(false) }
            }
        }
    }

    func subscribe(channelId: String, completion: @escaping (Bool)->Void) {
        subscribeTask?.cancel()
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else { completion(false); return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["userId": UserSession.shared.currentUserId, "channelId": channelId]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        subscribeTask = Task { [weak self] in
            do {
                let (data, response) = try await URLSession.shared.data(for: req)
                if let http = response as? HTTPURLResponse, http.statusCode == 403,
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   (obj["code"] as? String) == "USER_DISABLED" {
                    await MainActor.run { self?.errorMessage = "Tu cuenta está deshabilitada. Contacta al administrador." }
                    await MainActor.run { completion(false) }
                    return
                }
                let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
                await MainActor.run {
                    if ok {
                        self?.loadSubscribedChannels(isRefresh: true)
                        self?.loadBootstrap()
                    }
                    completion(ok)
                }
            } catch {
                await MainActor.run { completion(false) }
            }
        }
    }

    func canGuestSubscribe(completion: @escaping (Bool)->Void) {
        if UserSession.shared.isVerified { completion(true); return }
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") else { completion(false); return }
        Task {
            do {
                let (data, res) = try await URLSession.shared.data(from: url)
                guard (res as? HTTPURLResponse)?.statusCode == 200 else { await MainActor.run { completion(false) }; return }
                let count = (try? JSONDecoder().decode([Subscription].self, from: data))?.count ?? 0
                await MainActor.run { completion(count < 1) }
            } catch {
                await MainActor.run { completion(false) }
            }
        }
    }

    private func fetchChannels(publicOnly: Bool) async -> [Channel] {
        let base = "\(APIConfig.baseURL)/channels"
        let urlStr = publicOnly ? "\(base)?isPublic=true" : "\(base)?userId=\(UserSession.shared.currentUserId)"
        guard let url = URL(string: urlStr) else { return [] }
        do {
            var req = URLRequest(url: url)
            req.setValue(UserSession.shared.currentUserId, forHTTPHeaderField: "X-User-Id")
            let (data, res) = try await URLSession.shared.data(for: req)
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

    private func prefetchChannelDetails(for channels: [Channel], limit: Int = 24, concurrency: Int = 4) {
        detailsPrefetchTask?.cancel()
        guard !channels.isEmpty, !UserSession.shared.currentUserId.isEmpty else { return }
        let sorted = channels.sorted { a, b in
            let ac = a.last24hCount ?? 0
            let bc = b.last24hCount ?? 0
            if ac != bc { return ac > bc }
            let ad = ISO8601DateFormatter().date(from: a.lastMessageAt ?? "") ?? Date.distantPast
            let bd = ISO8601DateFormatter().date(from: b.lastMessageAt ?? "") ?? Date.distantPast
            return ad > bd
        }
        var uniq: [String] = []
        for c in sorted { if !uniq.contains(c.id) { uniq.append(c.id) } }
        let ids = Array(uniq.prefix(limit))
        detailsPrefetchTask = Task { [weak self] in
            var i = 0
            while i < ids.count {
                if Task.isCancelled { break }
                let end = min(i + concurrency, ids.count)
                let slice = Array(ids[i..<end])
                await withTaskGroup(of: Void.self) { group in
                    for id in slice {
                        group.addTask {
                            if let _ = PersistenceManager.shared.loadChannelDetail(id: id) {
                                guard let u = URL(string: "\(APIConfig.baseURL)/messages/channel/\(id)?limit=100") else { return }
                                do {
                                    let (data, res) = try await URLSession.shared.data(from: u)
                                    guard (res as? HTTPURLResponse)?.statusCode == 200 else { return }
                                    if let msgs = try? JSONDecoder().decode([Message].self, from: data) {
                                        PersistenceManager.shared.saveMessages(channelId: id, messages: msgs)
                                    }
                                } catch { }
                                return
                            }
                            guard let url = URL(string: "\(APIConfig.baseURL)/channels/\(id)?userId=\(UserSession.shared.currentUserId)") else { return }
                            do {
                                let (data, res) = try await URLSession.shared.data(from: url)
                                guard (res as? HTTPURLResponse)?.statusCode == 200 else { return }
                                if let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) {
                                    PersistenceManager.shared.saveChannelDetail(detail)
                                }
                            } catch { }
                        }
                    }
                }
                i = end
            }
            _ = self
        }
    }
}
