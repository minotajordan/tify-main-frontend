import SwiftUI
import UIKit
import UserNotifications

// MARK: - Models
struct Channel: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let description: String?
    let icon: String
    let memberCount: Int
    let parentId: String?
    let isPublic: Bool
    let isSubscribed: Bool?
    let isFavorite: Bool?
    let last24hCount: Int?
    let subchannels: [Subchannel]?
    
    struct Subchannel: Identifiable, Codable, Equatable {
        let id: String
        let title: String
        let icon: String
        let memberCount: Int?
    }
}

struct Message: Identifiable, Codable {
    let id: String
    let content: String
    let createdAt: String
    let senderId: String
    let channelId: String
    let isEmergency: Bool?
    let durationSeconds: Int?
    let deliveryMethod: String?
    let expiresAt: String?
    let eventAt: String?
    let publishedAt: String?
    let sender: User
    let viewsCount: Int?
    let viewedByMe: Bool?
    
    struct User: Codable {
        let id: String
        let username: String
        let fullName: String
    }
    
    // MARK: - Parsing robusto de fechas (cubre todos los casos de Supabase)
    private func parseDate(from string: String) -> Date? {
        var dateString = string.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // 1. ISO8601 con/sin milisegundos (Supabase suele usar este formato)
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime,
                                        .withDashSeparatorInDate,
                                        .withColonSeparatorInTime,
                                        .withTimeZone,
                                        .withFractionalSeconds]
        if let date = isoFormatter.date(from: dateString) {
            return date
        }
        isoFormatter.formatOptions.remove(.withFractionalSeconds)
        if let date = isoFormatter.date(from: dateString) {
            return date
        }
        
        // 2. Sin indicador de zona horaria → asumimos UTC y probamos formatos comunes
        if dateString.contains(" ") {
            dateString = dateString.replacingOccurrences(of: " ", with: "T")
        }
        
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0) // UTC
        
        let formats = [
            "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSSS",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss.SS",
            "yyyy-MM-dd'T'HH:mm:ss.S",
            "yyyy-MM-dd'T'HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss.SSS",
            "yyyy-MM-dd HH:mm:ss"
        ]
        
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: dateString) {
                return date
            }
        }
        
        return nil
    }
    
    // MARK: - Fecha de creación amigable
    var formattedDate: String {
        guard let date = parseDate(from: createdAt) else {
            return "fecha desconocida"
        }
        
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "es_CO")   // Colombia
        formatter.unitsStyle = .full                     // "hace 1 minuto", "ayer", etc.
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    // MARK: - Tiempo restante o "expirado"
    var expiresInString: String? {
        guard let expiresStr = expiresAt,
              let date = parseDate(from: expiresStr) else {
            return nil
        }
        
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "es_CO")
        formatter.unitsStyle = .full
        
        if date <= Date() {
            return "expirado"
        } else {
            return formatter.localizedString(for: date, relativeTo: Date())
            // Ejemplo: "en 5 minutos", "en 2 horas", "en 3 días"
        }
    }

    var eventInString: String? {
        guard let ev = eventAt, let date = parseDate(from: ev) else { return nil }
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "es_CO")
        formatter.unitsStyle = .full
        if date <= Date() {
            return "evento iniciado"
        } else {
            return formatter.localizedString(for: date, relativeTo: Date())
        }
    }
}

struct ChannelDetail: Codable {
    let id: String
    let title: String
    let description: String
    let icon: String
    let memberCount: Int
    let isPublic: Bool
    let parentId: String?
    let messages: [Message]
    let owner: Owner
    let subchannels: [Channel.Subchannel]?
    let approvalPolicy: String?
    var isSubscribed: Bool?
    
    struct Owner: Codable {
        let id: String
        let username: String
        let fullName: String
    }
}

struct UserProfile: Codable {
    let id: String
    let username: String
    let fullName: String?
    let email: String
    let phoneNumber: String?
    let isAdmin: Bool
    let createdAt: String
}

struct Subscription: Identifiable, Codable {
    let id: String
    let channelId: String
    let subscribedAt: String
    let isActive: Bool
    let channel: SubscribedChannel
    
    struct SubscribedChannel: Codable {
        let id: String
        let title: String
        let description: String?
        let icon: String
        let isPublic: Bool
        let memberCount: Int
    }
}

// MARK: - Date Extensions
extension Date {
    func timeAgoString() -> String {
        let seconds = Int(Date().timeIntervalSince(self))
        
        if seconds < 60 {
            return "hace \(seconds) segundo\(seconds == 1 ? "" : "s")"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "hace \(minutes) minuto\(minutes == 1 ? "" : "s")"
        } else if seconds < 86400 {
            let hours = seconds / 3600
            return "hace \(hours) hora\(hours == 1 ? "" : "s")"
        } else if seconds < 604800 {
            let days = seconds / 86400
            return "hace \(days) día\(days == 1 ? "" : "s")"
        } else {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "es")
            formatter.dateFormat = "dd MMM yyyy"
            return formatter.string(from: self)
        }
    }
    
    func timeUntilString() -> String {
        let seconds = Int(self.timeIntervalSince(Date()))
        
        if seconds <= 0 {
            return "expirado"
        } else if seconds < 60 {
            return "en \(seconds) segundo\(seconds == 1 ? "" : "s")"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "en \(minutes) minuto\(minutes == 1 ? "" : "s")"
        } else if seconds < 86400 {
            let hours = seconds / 3600
            return "en \(hours) hora\(hours == 1 ? "" : "s")"
        } else {
            let days = seconds / 86400
            return "en \(days) día\(days == 1 ? "" : "s")"
        }
    }
}

// MARK: - API Configuration
enum APIConfig {
    static let baseURL = "http://192.168.3.149:3333/api"
    static let currentUserId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
}

struct CategoryIds {
    static let general = "33333333-1111-2222-3333-444444444444"
    static let informativo = "33333333-5555-6666-7777-888888888888"
    static let emergente = "33333333-9999-aaaa-bbbb-cccccccccccc"
}

struct PasswordValidation: Codable { let valid: Bool }

class UserSession: ObservableObject {
    static let shared = UserSession()
    @Published var currentUserId: String = UserDefaults.standard.string(forKey: "current_user_id") ?? ""
    @Published var isVerified: Bool = UserDefaults.standard.bool(forKey: "user_is_verified")
    @Published var token: String? = UserDefaults.standard.string(forKey: "auth_token")
    func restoreSession() {
        let uid = UserDefaults.standard.string(forKey: "current_user_id")
        let tok = UserDefaults.standard.string(forKey: "auth_token")
        let ver = UserDefaults.standard.bool(forKey: "user_is_verified")
        if let uid = uid, !uid.isEmpty { currentUserId = uid }
        token = tok
        isVerified = ver || (tok != nil)
    }

    func ensureGuest() {
      guard currentUserId.isEmpty else { return }
      let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
      guard let url = URL(string: "\(APIConfig.baseURL)/users/guest") else { return }
      var req = URLRequest(url: url)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      let body = ["deviceId": deviceId]
      req.httpBody = try? JSONSerialization.data(withJSONObject: body)
      URLSession.shared.dataTask(with: req) { data, _, _ in
        DispatchQueue.main.async {
          if let data = data,
             let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
             let id = obj["id"] as? String {
            self.currentUserId = id
            UserDefaults.standard.set(id, forKey: "current_user_id")
          }
        }
      }.resume()
    }

    func ensureGuestSync(completion: @escaping () -> Void) {
      if !currentUserId.isEmpty { completion(); return }
      let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
      guard let url = URL(string: "\(APIConfig.baseURL)/users/guest") else { completion(); return }
      var req = URLRequest(url: url)
      req.httpMethod = "POST"
      req.setValue("application/json", forHTTPHeaderField: "Content-Type")
      let body = ["deviceId": deviceId]
      req.httpBody = try? JSONSerialization.data(withJSONObject: body)
      URLSession.shared.dataTask(with: req) { data, _, _ in
        DispatchQueue.main.async {
          if let data = data,
             let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
             let id = obj["id"] as? String {
            self.currentUserId = id
            UserDefaults.standard.set(id, forKey: "current_user_id")
          }
          completion()
        }
      }.resume()
    }

    func syncAPNSTokenIfAvailable() {
        let token = UserDefaults.standard.string(forKey: "apns_device_token") ?? ""
        guard !token.isEmpty, !currentUserId.isEmpty,
              let url = URL(string: "\(APIConfig.baseURL)/users/\(currentUserId)/messaging-settings") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "platform": "PUSH",
            "handle": token
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req) { _, _, _ in }.resume()
    }
}


// MARK: - Persistence Manager
class PersistenceManager {
    static let shared = PersistenceManager()
    
    private let channelsKey = "cached_channels"
    private let channelDetailsPrefix = "cached_channel_"
    private let userProfileKey = "cached_user_profile"
    private let subscriptionsKey = "cached_subscriptions"
    private let searchHistoryKey = "cached_search_history"
    
    func saveChannels(_ channels: [Channel]) {
        if let encoded = try? JSONEncoder().encode(channels) {
            UserDefaults.standard.set(encoded, forKey: channelsKey)
        }
    }
    
    func loadChannels() -> [Channel]? {
        guard let data = UserDefaults.standard.data(forKey: channelsKey),
              let channels = try? JSONDecoder().decode([Channel].self, from: data) else {
            return nil
        }
        return channels
    }
    
    func saveChannelDetail(_ detail: ChannelDetail) {
        let key = channelDetailsPrefix + detail.id
        if let encoded = try? JSONEncoder().encode(detail) {
            UserDefaults.standard.set(encoded, forKey: key)
        }
    }
    
    func loadChannelDetail(id: String) -> ChannelDetail? {
        let key = channelDetailsPrefix + id
        guard let data = UserDefaults.standard.data(forKey: key),
              let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) else {
            return nil
        }
        return detail
    }
    
    func saveUserProfile(_ profile: UserProfile) {
        if let encoded = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(encoded, forKey: userProfileKey)
        }
    }
    
    func loadUserProfile() -> UserProfile? {
        guard let data = UserDefaults.standard.data(forKey: userProfileKey),
              let profile = try? JSONDecoder().decode(UserProfile.self, from: data) else {
            return nil
        }
        return profile
    }
    
    func saveSubscriptions(_ subscriptions: [Subscription]) {
        if let encoded = try? JSONEncoder().encode(subscriptions) {
            UserDefaults.standard.set(encoded, forKey: subscriptionsKey)
        }
    }
    
    func loadSubscriptions() -> [Subscription]? {
        guard let data = UserDefaults.standard.data(forKey: subscriptionsKey),
              let subscriptions = try? JSONDecoder().decode([Subscription].self, from: data) else {
            return nil
        }
        return subscriptions
    }
    
    func loadSearchHistory() -> [String] {
        let arr = UserDefaults.standard.array(forKey: searchHistoryKey) as? [String] ?? []
        return Array(arr.reversed())
    }
    
    func saveSearchHistory(_ items: [String]) {
        let uniq = Array(NSOrderedSet(array: items).compactMap { $0 as? String })
        UserDefaults.standard.set(uniq, forKey: searchHistoryKey)
    }
    
    func appendSearchHistory(_ query: String) {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        var items = UserDefaults.standard.array(forKey: searchHistoryKey) as? [String] ?? []
        items.append(q)
        saveSearchHistory(items)
    }
}

// MARK: - ViewModels
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

class ProfileViewModel: ObservableObject {
    @Published var userProfile: UserProfile?
    @Published var subscriptions: [Subscription] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    
    init() {
        if let cachedProfile = PersistenceManager.shared.loadUserProfile() {
            self.userProfile = cachedProfile
        }
        if let cachedSubs = PersistenceManager.shared.loadSubscriptions() {
            self.subscriptions = cachedSubs
        }
    }
    
    func loadProfile(isRefresh: Bool = false) {
        if isRefresh {
            isRefreshing = true
        } else {
            isLoading = userProfile == nil
        }
        
        errorMessage = nil
        
        guard let url = URL(string: "\(APIConfig.baseURL)/users/\(UserSession.shared.currentUserId)") else {
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
                    if self?.userProfile == nil {
                        self?.errorMessage = "Error: \(error.localizedDescription)"
                    }
                    return
                }
                
                guard let data = data else { return }
                
                do {
                    let profile = try JSONDecoder().decode(UserProfile.self, from: data)
                    self?.userProfile = profile
                    PersistenceManager.shared.saveUserProfile(profile)
                } catch {
                    print("Error: \(error)")
                }
            }
        }.resume()
    }
    
    func loadSubscriptions(isRefresh: Bool = false) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") else { return }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let data = data else { return }
                
                do {
                    let subs = try JSONDecoder().decode([Subscription].self, from: data)
                    self?.subscriptions = subs
                    PersistenceManager.shared.saveSubscriptions(subs)
                } catch {
                    print("Error: \(error)")
                }
            }
        }.resume()
    }
    
    func unsubscribe(channelId: String, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "userId": UserSession.shared.currentUserId,
            "channelId": channelId
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            DispatchQueue.main.async {
                if error == nil, let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    self?.loadSubscriptions(isRefresh: true)
                    completion(true)
                } else {
                    completion(false)
                }
            }
        }.resume()
    }
}

// MARK: - Views
struct ChannelsView: View {
    let onInitialDataReady: (() -> Void)?
    @StateObject private var viewModel = ChannelsViewModel()
    init(onInitialDataReady: (() -> Void)? = nil) {
        self.onInitialDataReady = onInitialDataReady
    }
    @ObservedObject private var session = UserSession.shared
    @State private var searchText = ""
    @State private var didNotifyInitialReady = false

    @State private var searching = false
    @State private var searchError: String?

    @State private var isSearchMode = false // NUEVO: para diferenciar vista normal vs búsqueda
    @FocusState private var searchFocused: Bool
    @State private var searchDebounce: DispatchWorkItem?
    @State private var searchTask: URLSessionDataTask?
    @State private var showSettingsSheet = false
    @State private var showComposeSelector = false
    @State private var composeChannelId: String? = nil
    @State private var showComposeSheet = false
    @State private var showMessagesSheet = false
    @State private var showHistoryDrawer = false
    @State private var searchHistory: [String] = []
    @State private var selectedTopTab = 0
    @State private var navChannelId: String? = nil
    @State private var navNavigate = false
    @AppStorage("app_appearance") private var appAppearance: String = "system"
    @State private var pendingSubscribeChannelId: String? = nil
    @State private var showLoginFromList = false
    @State private var showSubscribeErrorAlert = false
    
    @ViewBuilder private func bottomFloatingBar() -> some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                    TextField("Buscar canales", text: $searchText)
                        .disableAutocorrection(true)
                        .textInputAutocapitalization(.never)
                        .submitLabel(.search)
                        .focused($searchFocused)
                        .onTapGesture { isSearchMode = true }
                        .onSubmit { searchChannels() }
                        .onChange(of: searchText) { _ in scheduleSearch() }
                    if !searchText.isEmpty {
                        Button(action: { searchText = ""; isSearchMode = false; searchFocused = false }) {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                        }
                    }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
            HStack(spacing: 8) {
                Button { showSettingsSheet = true } label: {
                    Image(systemName: "gearshape")
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(.ultraThinMaterial))
                }
                Button { showComposeSelector = true } label: {
                    Image(systemName: "square.and.pencil")
                        .foregroundColor(.primary)
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(.ultraThinMaterial))
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 12)
    }
    
    @ViewBuilder private func skeletonChannels() -> some View {
        List {
            ForEach(0..<6, id: \.self) { _ in
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color(.systemGray5))
                        .frame(width: 40, height: 40)
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 6).fill(Color(.systemGray5)).frame(height: 12)
                        RoundedRectangle(cornerRadius: 6).fill(Color(.systemGray5)).frame(width: 180, height: 10)
                    }
                    Spacer()
                }
                .padding(.vertical, 6)
            }
        }
    }
    
    @ViewBuilder private func historyOverlay() -> some View {
        if showHistoryDrawer {
            ZStack(alignment: .leading) {
                Color.black.opacity(0.2)
                    .ignoresSafeArea()
                    .onTapGesture { withAnimation { showHistoryDrawer = false } }
                VStack(alignment: .leading) {
                    HStack {
                        Text("Historial de búsqueda").font(.headline)
                        Spacer()
                        Button("Cerrar") { withAnimation { showHistoryDrawer = false } }
                    }
                    .padding(.bottom, 4)
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ForEach(searchHistory, id: \.self) { q in
                                Button {
                                    searchText = q
                                    isSearchMode = true
                                    withAnimation { showHistoryDrawer = false }
                                    scheduleSearch()
                                } label: {
                                    HStack { Image(systemName: "magnifyingglass"); Text(q); Spacer() }
                                        .padding(.vertical, 8)
                                }
                            }
                        }
                    }
                }
                .frame(width: 280)
                .padding()
                .background(.ultraThinMaterial)
                .transition(.move(edge: .leading))
            }
        }
    }
    
    @ViewBuilder private func channelsList() -> some View {
        List {
            if isSearchMode {
                Section {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundColor(.blue)
                        Text("Resultados de búsqueda").font(.caption).foregroundColor(.secondary)
                        Spacer()
                        Button("Ver mis canales") {
                            isSearchMode = false
                            searchText = ""
                            viewModel.loadSubscribedChannels(isRefresh: true)
                        }
                        .font(.caption)
                    }
                }
            }
            if !viewModel.favorites.isEmpty && !isSearchMode {
                Section {
                    HStack {
                        Image(systemName: "star.fill").foregroundColor(.yellow)
                        Text("Favoritos").font(.caption).fontWeight(.semibold).foregroundColor(.secondary)
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(viewModel.favorites) { fav in
                                NavigationLink(destination: ChannelDetailView(channelId: fav.id, channelTitle: fav.title)) {
                                    HStack(spacing: 6) {
                                        Image(systemName: fav.icon).foregroundColor(.blue)
                                        Text(fav.title).font(.caption)
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical, 4)
                }
            }
            if selectedTopTab == 0 {
                ForEach(viewModel.channels.filter { $0.parentId == nil && ($0.isSubscribed ?? false) }) { channel in
                    ChannelCard(channel: channel, isSearchMode: isSearchMode)
                        .environmentObject(viewModel)
                        .listRowInsets(EdgeInsets(top: 3, leading: 3, bottom: 3, trailing: 3))
                }
            } else if selectedTopTab == 2 {
                Section {
                    let trending = viewModel.channels.filter { $0.parentId == nil }.sorted { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) }
                    ForEach(trending) { ch in
                        HStack(spacing: 10) {
                            Image(systemName: ch.icon).foregroundColor(.blue)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(ch.title).font(.subheadline)
                                Text("Inscritos 24h: \(ch.last24hCount ?? 0)").font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { navChannelId = ch.id; navNavigate = true }
                        .background(
                            NavigationLink(destination: ChannelDetailView(channelId: navChannelId ?? "", channelTitle: ""), isActive: $navNavigate) { EmptyView() }
                        )
                    }
                }
            } else {
                let parents = viewModel.channels.filter { $0.parentId == nil }
                ForEach(parents) { city in
                    Section(header: HStack { Image(systemName: city.icon).foregroundColor(.blue); Text(city.title) }) {
                        if let subs = city.subchannels, !subs.isEmpty {
                            ForEach(subs) { sub in
                                HStack(spacing: 10) { Image(systemName: sub.icon).foregroundColor(.green); Text(sub.title); Spacer() }
                                                .contentShape(Rectangle())
                                                .onTapGesture { navChannelId = sub.id; navNavigate = true }
                                                .background(
                                                    NavigationLink(destination: ChannelDetailView(channelId: navChannelId ?? "", channelTitle: ""), isActive: $navNavigate) { EmptyView() }
                                                )
                            }
                        } else {
                            HStack(spacing: 10) { Image(systemName: city.icon).foregroundColor(.blue); Text(city.title); Spacer() }
                                            .contentShape(Rectangle())
                                            .onTapGesture { navChannelId = city.id; navNavigate = true }
                                            .background(
                                                NavigationLink(destination: ChannelDetailView(channelId: navChannelId ?? "", channelTitle: ""), isActive: $navNavigate) { EmptyView() }
                                            )
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .listRowSeparator(.visible)
        .listRowSeparatorTint(Color(.systemGray3))
        .listSectionSeparatorTint(Color(.systemGray3))
        .padding(.bottom, 90)
        .overlay(bottomFloatingBar(), alignment: .bottom)
        .overlay(historyOverlay(), alignment: .leading)
        .sheet(isPresented: $showLoginFromList) {
            if let cid = pendingSubscribeChannelId {
                LoginView {
                    showLoginFromList = false
                    viewModel.subscribe(channelId: cid) { ok in if !ok { showSubscribeErrorAlert = true } }
                }
            }
        }
        .alert("Lo sentimos", isPresented: $showSubscribeErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Intenta más tarde.")
        }
        .refreshable {
            await withCheckedContinuation { continuation in
                if isSearchMode {
                    searchChannels()
                } else {
                    viewModel.loadSubscribedChannels(isRefresh: true)
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    continuation.resume()
                }
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack(alignment: .top) {
                if viewModel.isLoading {
                    skeletonChannels()
                } else if let errorMessage = viewModel.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Error")
                            .font(.headline)
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        Button(action: {
                            viewModel.loadSubscribedChannels(isRefresh: true)
                        }) {
                            Label("Reintentar", systemImage: "arrow.clockwise")
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                } else if viewModel.channels.isEmpty && !isSearchMode {
                    VStack(spacing: 16) {
                        if selectedTopTab == 0 {
                            Image(systemName: "bell.slash").font(.system(size: 50)).foregroundColor(.gray)
                            Text("No estás suscrito a ningún canal").font(.headline).foregroundColor(.secondary)
                            HStack(spacing: 10) {
                                Button { withAnimation { selectedTopTab = 2 } } label: { Label("Ver tendencias", systemImage: "chart.line.uptrend.xyaxis") }
                                    .padding(.horizontal, 16).padding(.vertical, 8).background(Color.blue).foregroundColor(.white).cornerRadius(8)
                                Button { withAnimation { selectedTopTab = 1 } } label: { Label("Ver ciudades", systemImage: "map") }
                                    .padding(.horizontal, 16).padding(.vertical, 8).background(Color.gray.opacity(0.2)).cornerRadius(8)
                            }
                        } else if selectedTopTab == 2 {
                            List {
                                let trending = viewModel.channels.sorted { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) }
                                ForEach(trending.filter { $0.parentId == nil }) { ch in
                                    NavigationLink(destination: ChannelDetailView(channelId: ch.id, channelTitle: ch.title)) {
                                        HStack(spacing: 10) {
                                            Image(systemName: ch.icon).foregroundColor(.blue)
                                            VStack(alignment: .leading, spacing: 4) {
                                                Text(ch.title).font(.subheadline)
                                                Text("Seguidos esta semana: \(ch.last24hCount ?? 0)").font(.caption).foregroundColor(.secondary)
                                            }
                                            Spacer()
                                        }
                                        .contentShape(Rectangle())
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        } else {
                            List {
                                let parents = viewModel.channels.filter { $0.parentId == nil }
                                ForEach(parents) { city in
                                    Section(header: HStack { Image(systemName: city.icon).foregroundColor(.blue); Text(city.title) }) {
                                        if let subs = city.subchannels, !subs.isEmpty {
                                            ForEach(subs) { sub in
                                                NavigationLink(destination: ChannelDetailView(channelId: sub.id, channelTitle: sub.title)) {
                                                    HStack(spacing: 10) {
                                                        Image(systemName: sub.icon).foregroundColor(.green)
                                                        Text(sub.title)
                                                        Spacer()
                                                    }
                                                }
                                            }
                                        } else {
                                            NavigationLink(destination: ChannelDetailView(channelId: city.id, channelTitle: city.title)) {
                                                HStack(spacing: 10) {
                                                    Image(systemName: city.icon).foregroundColor(.blue)
                                                    Text(city.title)
                                                    Spacer()
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    channelsList()
                }
        }
        .simultaneousGesture(TapGesture().onEnded { if searchFocused { searchFocused = false } })
        .navigationTitle(isSearchMode ? "Búsqueda" : "")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { withAnimation { showHistoryDrawer = true; searchHistory = PersistenceManager.shared.loadSearchHistory() } }) {
                        Image(systemName: "line.3.horizontal")
                    }
                }
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Button(action: { selectedTopTab = 0 }) {
                            Text("Mis canales").font(.subheadline).fontWeight(.semibold)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(selectedTopTab == 0 ? AnyView(Capsule().fill(Color(.systemGray5))) : AnyView(Capsule().stroke(Color(.systemGray4))))

                        Button(action: { selectedTopTab = 1 }) {
                            Text("Ciudades").font(.subheadline).fontWeight(.semibold)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(selectedTopTab == 1 ? AnyView(Capsule().fill(Color(.systemGray5))) : AnyView(Capsule().stroke(Color(.systemGray4))))

                        Button(action: { selectedTopTab = 2 }) {
                            Text("Tendencias").font(.subheadline).fontWeight(.semibold)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(selectedTopTab == 2 ? AnyView(Capsule().fill(Color(.systemGray5))) : AnyView(Capsule().stroke(Color(.systemGray4))))
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showMessagesSheet = true }) {
                        Image(systemName: "paperplane")
                    }
                }
            }
            .onAppear {
                searchHistory = PersistenceManager.shared.loadSearchHistory()
                let verified = UserSession.shared.isVerified || UserDefaults.standard.bool(forKey: "user_is_verified")
                if verified {
                    let cachedSubsCount = (PersistenceManager.shared.loadSubscriptions()?.count ?? 0)
                    let hasSubscribedLocal = cachedSubsCount > 0 || viewModel.channels.contains { $0.parentId == nil && ($0.isSubscribed ?? false) }
                    selectedTopTab = hasSubscribedLocal ? 0 : 2
                    viewModel.loadSubscribedChannels(isRefresh: true)
                    if !hasSubscribedLocal {
                        viewModel.loadChannels(isRefresh: true, publicOnly: true)
                        DispatchQueue.main.async { viewModel.channels.sort { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) } }
                    }
                } else {
                    selectedTopTab = 2
                    viewModel.loadChannels(isRefresh: true, publicOnly: true)
                    DispatchQueue.main.async { viewModel.channels.sort { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) } }
                }
                if !viewModel.isLoading && !didNotifyInitialReady {
                    didNotifyInitialReady = true
                    onInitialDataReady?()
                }
                UserSession.shared.ensureGuestSync {
                    UserSession.shared.syncAPNSTokenIfAvailable()
                }
            }
            .onChange(of: session.currentUserId) { newId in
                if !newId.isEmpty {
                    if UserSession.shared.isVerified {
                        viewModel.loadSubscribedChannels(isRefresh: true)
                        selectedTopTab = 0
                    } else {
                        selectedTopTab = 2
                        viewModel.loadChannels(isRefresh: true, publicOnly: true)
                        DispatchQueue.main.async { viewModel.channels.sort { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) } }
                    }
                    UserSession.shared.syncAPNSTokenIfAvailable()
                }
            }
            .onChange(of: viewModel.isLoading) { loading in
                if !loading && !didNotifyInitialReady {
                    didNotifyInitialReady = true
                    onInitialDataReady?()
                }
            }
            .onChange(of: viewModel.channels) { chs in
                if UserSession.shared.isVerified && chs.filter({ $0.parentId == nil && ($0.isSubscribed ?? false) }).isEmpty {
                    selectedTopTab = 2
                }
            }
            .onChange(of: selectedTopTab) { tab in
                switch tab {
                case 0:
                    viewModel.loadSubscribedChannels(isRefresh: true)
                case 1:
                    viewModel.loadChannels(isRefresh: true, publicOnly: true)
                default:
                    viewModel.loadChannels(isRefresh: true, publicOnly: true)
                    DispatchQueue.main.async {
                        viewModel.channels.sort { ($0.last24hCount ?? 0) > ($1.last24hCount ?? 0) }
                    }
                }
            }
            .sheet(isPresented: $showSettingsSheet) {
                ProfileView()
            }
            .sheet(isPresented: $showComposeSelector) {
                NavigationView {
                    List {
                        Section("Selecciona un canal") {
                            ForEach(viewModel.channels.filter { $0.parentId == nil }) { ch in
                                Button {
                                    composeChannelId = ch.id
                                    showComposeSelector = false
                                    showComposeSheet = true
                                } label: {
                                    HStack(spacing: 8) {
                                        Image(systemName: ch.icon).foregroundColor(.blue)
                                        Text(ch.title)
                                        Spacer()
                                    }
                                }
                            }
                        }
                    }
                    .navigationTitle("Nuevo mensaje")
                    .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { showComposeSelector = false } } }
                }
            }
            .sheet(isPresented: $showComposeSheet) {
                if let cid = composeChannelId {
                    ComposeMessageView(channelId: cid) {
                        viewModel.loadSubscribedChannels(isRefresh: true)
                    }
                }
            }
            .sheet(isPresented: $showMessagesSheet) {
                MessagesView()
            }
        }
    }

    func searchChannels() {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty {
            searching = false
            isSearchMode = false
            viewModel.loadSubscribedChannels(isRefresh: true)
            return
        }
        searching = true
        isSearchMode = true
        PersistenceManager.shared.appendSearchHistory(q)
        searchTask?.cancel()
        guard let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(APIConfig.baseURL)/channels/search?q=\(encoded)") else {
            searching = false
            return
        }
        let task = URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                self.searching = false
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self.viewModel.channels = items.filter { $0.parentId == nil }
                    if items.isEmpty {
                        self.searchError = "No se encontraron canales con '\(q)'"
                    }
                }
            }
        }
        searchTask = task
        task.resume()
    }
    
    func scheduleSearch() {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        searchDebounce?.cancel()
        if q.isEmpty {
            searching = false
            isSearchMode = false
            viewModel.loadSubscribedChannels(isRefresh: true)
            return
        }
        let work = DispatchWorkItem { self.searchChannels() }
        searchDebounce = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45, execute: work)
    }
}



class SearchViewModel: ObservableObject {
    @Published var suggestions: [Channel] = []
    @Published var results: [Channel] = []
    @Published var isLoading = false
    @Published var query: String = ""
    @Published var referenceCode: String = ""

    func loadSuggestions() {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels?isPublic=true") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self?.suggestions = items
                        .filter { $0.isPublic && $0.parentId == nil }
                        .sorted(by: { $0.memberCount > $1.memberCount })
                        .prefix(10)
                        .map { $0 }
                }
            }
        }.resume()
    }

    func search() {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { results = []; return }
        isLoading = true
        let encoded = q.addingPercentEncoding(withAllowedCharacters: CharacterSet.urlQueryAllowed) ?? ""
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/search?q=\(encoded)&exact=false") else { isLoading = false; return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                self?.isLoading = false
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self?.results = items.filter { $0.parentId == nil }
                }
            }
        }.resume()
    }
    
    func searchByCode() {
        let code = referenceCode.trimmingCharacters(in: .whitespacesAndNewlines)
        if code.isEmpty { results = []; return }
        isLoading = true
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/search?referenceCode=\(code)") else {
            isLoading = false
            return
        }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            DispatchQueue.main.async {
                self?.isLoading = false
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self?.results = items.filter { $0.parentId == nil }
                }
            }
        }.resume()
    }
}

struct SearchOverlay: View {
    let onDismiss: () -> Void
    let onSearchResults: ([Channel]) -> Void
    @StateObject private var vm = SearchViewModel()
    @State private var searchMode: SearchMode = .suggestions
    
    enum SearchMode {
        case suggestions
        case textSearch
        case codeSearch
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                VStack(spacing: 12) {
                    HStack {
                        TextField("Buscar por nombre", text: $vm.query)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .onChange(of: vm.query) { newValue in
                                if !newValue.isEmpty {
                                    searchMode = .textSearch
                                    vm.search()
                                } else {
                                    searchMode = .suggestions
                                }
                            }
                        
                        Button("Cerrar") {
                            onDismiss()
                        }
                    }
                    
                    HStack {
                        TextField("Código de referencia", text: $vm.referenceCode)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                        
                        Button(action: {
                            if !vm.referenceCode.isEmpty {
                                searchMode = .codeSearch
                                vm.searchByCode()
                            }
                        }) {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.blue)
                        }
                        .disabled(vm.referenceCode.isEmpty)
                    }
                }
                .padding()
                
                if vm.isLoading {
                    ProgressView("Buscando...")
                        .padding()
                }
                
                List {
                    if searchMode == .suggestions {
                        Section(header: Text("Canales disponibles")) {
                            if vm.suggestions.isEmpty {
                                Text("No hay sugerencias disponibles")
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(vm.suggestions) { ch in
                                    SearchChannelRow(channel: ch) {
                                        onSearchResults([ch])
                                        onDismiss()
                                    }
                                }
                            }
                        }
                    } else {
                        Section(header: Text("Resultados")) {
                            if vm.results.isEmpty && !vm.isLoading {
                                Text("No se encontraron canales")
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(vm.results) { ch in
                                    SearchChannelRow(channel: ch) {
                                        onSearchResults(vm.results)
                                        onDismiss()
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Buscar Canales")
            .onAppear {
                vm.loadSuggestions()
            }
            .onChange(of: vm.suggestions) { items in
                if searchMode == .suggestions && !items.isEmpty {
                    onSearchResults(items)
                }
            }
            .onChange(of: vm.results) { items in
                if searchMode != .suggestions {
                    onSearchResults(items)
                }
            }
        }
    }
}

struct SearchChannelRow: View {
    let channel: Channel
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                Image(systemName: channel.icon)
                    .foregroundColor(channel.isPublic ? .blue : .orange)
                    .frame(width: 30)
                
                VStack(alignment: .leading) {
                    HStack {
                        Text(channel.title)
                            .foregroundColor(.primary)
                        
                        if !channel.isPublic {
                            Image(systemName: "lock.fill")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        if (channel.isSubscribed ?? false) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                    }
                    
                    Text(channel.description ?? "")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                            .font(.caption2)
                        Text(String(channel.memberCount))
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
    }
}

struct ChannelCard: View {
    let channel: Channel
    let isSearchMode: Bool
    @State private var isExpanded = false
    @State private var last24hCount: Int? = nil
    @State private var subchannelsCount: Int? = nil
    @State private var totalMembers: Int? = nil
    @State private var goToDetail: Bool = false
    @EnvironmentObject var channelsVM: ChannelsViewModel
    
    private func loadStats() {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/\(channel.id)?userId=\(UserSession.shared.currentUserId)") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                guard let data = data, let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) else { return }
                totalMembers = detail.memberCount
                subchannelsCount = detail.subchannels?.count ?? (channel.subchannels?.count ?? 0)
                let now = Date()
                let dayAgo = now.addingTimeInterval(-86400)
                let iso = ISO8601DateFormatter()
                iso.formatOptions = [.withInternetDateTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone, .withFractionalSeconds]
                let fmt = DateFormatter()
                fmt.locale = Locale(identifier: "en_US_POSIX")
                fmt.timeZone = TimeZone(secondsFromGMT: 0)
                let formats = ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss"]
                func parse(_ raw: String) -> Date? {
                    var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
                    if s.contains(" ") { s = s.replacingOccurrences(of: " ", with: "T") }
                    if let d = iso.date(from: s) { return d }
                    for f in formats { fmt.dateFormat = f; if let d = fmt.date(from: s) { return d } }
                    return nil
                }
                var agg = detail.messages.reduce(0) { acc, msg in
                    let d = parse(msg.publishedAt ?? msg.createdAt)
                    return acc + ((d.map { $0 >= dayAgo } ?? false) ? 1 : 0)
                }
                if agg == 0, let subs = detail.subchannels, !subs.isEmpty {
                    let ids = subs.map { $0.id }.prefix(8)
                    for sid in ids {
                        guard let u = URL(string: "\(APIConfig.baseURL)/channels/\(sid)?userId=\(UserSession.shared.currentUserId)") else { continue }
                        URLSession.shared.dataTask(with: u) { d, _, _ in
                            DispatchQueue.main.async {
                                if let d = d, let det = try? JSONDecoder().decode(ChannelDetail.self, from: d) {
                                    let add = det.messages.reduce(0) { a, m in
                                        let dd = parse(m.publishedAt ?? m.createdAt)
                                        return a + ((dd.map { $0 >= dayAgo } ?? false) ? 1 : 0)
                                    }
                                    agg += add
                                    last24hCount = agg
                                }
                            }
                        }.resume()
                    }
                }
                last24hCount = agg
            }
        }.resume()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 2) {
                HStack(spacing: 2) {
                    Image(systemName: channel.icon)
                        .font(.title2)
                        .foregroundColor(channel.isPublic ? .blue : .orange)
                        .frame(width: 40, height: 40)
                        .background(
                            Circle()
                                .fill(channel.isPublic ? Color.blue.opacity(0.1) : Color.orange.opacity(0.1))
                        )
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(channel.title)
                                .font(.headline)
                                .foregroundColor(.primary)
                            if !channel.isPublic {
                                Image(systemName: "lock.fill")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                            if (channel.last24hCount ?? (last24hCount ?? 0)) > 0 {
                                Image(systemName: "bell.fill")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                        }
                        Text(channel.description ?? "")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Button(action: {
                        withAnimation(.spring(response: 0.3)) {
                            isExpanded.toggle()
                            if isExpanded { loadStats() }
                        }
                    }) {
                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                            .foregroundColor(.blue)
                            .padding(8)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            if isExpanded {
                HStack(spacing: 12) {
                    Label("\(channel.last24hCount ?? (last24hCount ?? 0)) /24h", systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                    Label("\(subchannelsCount ?? (channel.subchannels?.count ?? 0))", systemImage: "arrow.branch")
                        .font(.caption)
                        .foregroundColor(.purple)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(8)
                    Label(String(totalMembers ?? channel.memberCount), systemImage: "person.2.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.bottom, 10)
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        .overlay(
            Group {
                if isSearchMode && !(channel.isSubscribed ?? false) {
                    VStack {
                        HStack {
                            Spacer()
                            Text("No suscrito")
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.2))
                                .cornerRadius(4)
                                .padding(8)
                        }
                        Spacer()
                    }
                }
            }
        )
        .contentShape(Rectangle())
        .onTapGesture { goToDetail = true }
        .background(
            NavigationLink(destination: ChannelDetailView(channelId: channel.id, channelTitle: channel.title), isActive: $goToDetail) { EmptyView() }
        )
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button { /* acción A */ } label: { Text("Opción 1") }
            Button { /* acción B */ } label: { Text("Opción 2") }
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button { /* acción C */ } label: { Text("Opción 3") }
            Button { /* acción D */ } label: { Text("Opción 4") }
        }
    }
}

struct SubchannelRow: View {
    let subchannel: Channel.Subchannel
    let parentTitle: String
    @EnvironmentObject var channelsVM: ChannelsViewModel
    
    var body: some View {
        NavigationLink(destination: ChannelDetailView(channelId: subchannel.id, channelTitle: subchannel.title)) {
            HStack(spacing: 12) {
                HStack(spacing: 4) {
                    Rectangle()
                        .fill(Color.blue.opacity(0.3))
                        .frame(width: 2, height: 30)
                    
                    Image(systemName: subchannel.icon)
                        .font(.body)
                        .foregroundColor(.blue)
                        .frame(width: 30, height: 30)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(subchannel.title)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Text("↳ \(parentTitle)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: "person.2.fill")
                        .font(.caption2)
                    Text(String(subchannel.memberCount ?? 0))
                        .font(.caption)
                }
                .foregroundColor(.secondary)
                
                Button(action: {
                    channelsVM.toggleFavorite(channelId: subchannel.id, makeFavorite: true)
                }) {
                    Image(systemName: "star")
                        .foregroundColor(.yellow)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Color(.systemBackground))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ChannelDetailView: View {
    let channelId: String
    let channelTitle: String
    let highlightMessageId: String?
    @StateObject private var viewModel = ChannelDetailViewModel()
    @Environment(\.colorScheme) var colorScheme
    @State private var showingUnsubscribeAlert = false
    @State private var showRegister = false
    @State private var regPhone = ""
    @State private var regUsername = ""
    @State private var regFullName = ""
    @State private var regAvatar = ""
    @State private var regCode = ""
    @State private var regStage = 1
    @State private var regError: String? = nil
    @State private var regSending = false
    @State private var regInfo: String? = nil
    @State private var subscribeErrorAlert = false

    init(channelId: String, channelTitle: String, highlightMessageId: String? = nil) {
        self.channelId = channelId
        self.channelTitle = channelTitle
        self.highlightMessageId = highlightMessageId
    }
    
    var body: some View {
        ZStack(alignment: .top) {
            if viewModel.isLoading {
                ProgressView("Cargando mensajes...")
            } else if let errorMessage = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    Text("Error")
                        .font(.headline)
                    Text(errorMessage)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    Button(action: {
                        viewModel.loadChannelDetail(channelId: channelId)
                    }) {
                        Label("Reintentar", systemImage: "arrow.clockwise")
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            } else if let detail = viewModel.channelDetail {
                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        Image(systemName: detail.icon)
                            .font(.title2)
                            .foregroundColor(.blue)
                            .frame(width: 40, height: 40)
                            .background(Circle().fill(Color.blue.opacity(0.1)))
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(detail.description)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            HStack(spacing: 4) {
                                Image(systemName: "person.2.fill")
                                    .font(.caption2)
                                Text(String(detail.memberCount) + " miembros")
                                    .font(.caption)
                            }
                            .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        Button(action: { viewModel.showCompose = true }) {
                            Image(systemName: "square.and.pencil")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))

                    if !detail.isPublic {
                        HStack(spacing: 8) {
                            Button(action: { viewModel.showPasswordPrompt = true }) { Label("Validar acceso", systemImage: "lock") }
                            if (detail.isSubscribed ?? false) {
                                if !(viewModel.isPrimarySubchannel && detail.parentId != nil) {
                                    Button(action: { showingUnsubscribeAlert = true }) { Label("Desuscribirse", systemImage: "bell.slash") }
                                }
                            } else {
                                Button(action: {
                                    func optimisticSet(_ subscribed: Bool) { viewModel.channelDetail?.isSubscribed = subscribed }
                                    if UserSession.shared.isVerified {
                                        optimisticSet(true)
                                        viewModel.subscribe(channelId: detail.id) { ok in if !ok { optimisticSet(false); subscribeErrorAlert = true } }
                                    } else {
                                        if let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") {
                                            URLSession.shared.dataTask(with: url) { data, _, _ in
                                                let count = (try? JSONDecoder().decode([Subscription].self, from: data ?? Data()))?.count ?? 0
                                                DispatchQueue.main.async {
                                                    if count < 1 {
                                                        optimisticSet(true)
                                                        viewModel.subscribe(channelId: detail.id) { ok in if !ok { optimisticSet(false); subscribeErrorAlert = true } }
                                                    } else {
                                                        showRegister = true
                                                    }
                                                }
                                            }.resume()
                                        } else {
                                            showRegister = true
                                        }
                                    }
                                }) { Label("Suscribirse", systemImage: "bell.badge") }
                            }
                        }
                        .padding(.horizontal)
                    }
                    if detail.isPublic {
                        HStack(spacing: 8) {
                            if (detail.isSubscribed ?? false) {
                                if !(viewModel.isPrimarySubchannel && detail.parentId != nil) {
                                    Button(action: { showingUnsubscribeAlert = true }) { Label("Desuscribirse", systemImage: "bell.slash") }
                                }
                            } else {
                                Button(action: {
                                    func optimisticSet(_ subscribed: Bool) { viewModel.channelDetail?.isSubscribed = subscribed }
                                    if UserSession.shared.isVerified {
                                        optimisticSet(true)
                                        viewModel.subscribe(channelId: detail.id) { ok in if !ok { optimisticSet(false); subscribeErrorAlert = true } }
                                    } else {
                                        if let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") {
                                            URLSession.shared.dataTask(with: url) { data, _, _ in
                                                let count = (try? JSONDecoder().decode([Subscription].self, from: data ?? Data()))?.count ?? 0
                                                DispatchQueue.main.async {
                                                    if count < 1 {
                                                        optimisticSet(true)
                                                        viewModel.subscribe(channelId: detail.id) { ok in if !ok { optimisticSet(false); subscribeErrorAlert = true } }
                                                    } else {
                                                        showRegister = true
                                                    }
                                                }
                                            }.resume()
                                        } else {
                                            showRegister = true
                                        }
                                    }
                                }) { Label("Suscribirse", systemImage: "bell.badge") }
                            }
                        }
                        .padding(.horizontal)
                    }
                    if let subchannels = detail.subchannels, !subchannels.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "arrow.turn.down.right")
                                    .font(.caption)
                                Text("Subcanales")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                            }
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                            .padding(.top, 8)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(subchannels) { sub in
                                        NavigationLink(destination: ChannelDetailView(channelId: sub.id, channelTitle: sub.title)) {
                                            VStack(spacing: 4) {
                                                Image(systemName: sub.icon)
                                                    .font(.title3)
                                                    .foregroundColor(.blue)
                                                Text(sub.title)
                                                    .font(.caption)
                                                    .foregroundColor(.primary)
                                            }
                                            .frame(width: 80, height: 70)
                                            .background(Color(.systemGray6))
                                            .cornerRadius(8)
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                            .padding(.bottom, 8)
                        }
                        .background(Color(.systemBackground))
                    }
                    
                    Divider()
                    
                    if (viewModel.activeSubchannelDetail?.messages ?? detail.messages).isEmpty {
                        VStack(spacing: 16) {
                            Spacer()
                            Image(systemName: "message")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                            Text("No hay mensajes aún")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                    } else {
                        ScrollViewReader { proxy in
                            ScrollView {
                                LazyVStack(spacing: 12) {
                                    ForEach(viewModel.activeSubchannelDetail?.messages ?? detail.messages) { message in
                                        MessageBubble(message: message)
                                            .id(message.id)
                                    }
                                }
                                .padding()
                            }
                            .onAppear {
                                if let hid = highlightMessageId {
                                    withAnimation { proxy.scrollTo(hid, anchor: .center) }
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(viewModel.channelDetail?.title ?? channelTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if viewModel.isRefreshing {
                    ProgressView().scaleEffect(0.8)
                } else {
                    Button(action: {
                        withAnimation {
                            viewModel.loadChannelDetail(channelId: viewModel.channelDetail?.id ?? channelId, isRefresh: true)
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .onAppear {
            if viewModel.channelDetail == nil {
                viewModel.loadChannelDetail(channelId: channelId)
            } else {
                viewModel.loadChannelDetail(channelId: channelId, isRefresh: true)
            }
            if let url = URL(string: "\(APIConfig.baseURL)/channels/\(channelId)/visit") {
                var req = URLRequest(url: url)
                req.httpMethod = "POST"
                if let tok = UserSession.shared.token { req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization") }
                URLSession.shared.dataTask(with: req) { _,_,_ in }.resume()
            }
        }
        .sheet(isPresented: $viewModel.showCompose) {
            ComposeMessageView(channelId: viewModel.channelDetail?.id ?? channelId) {
                viewModel.loadChannelDetail(channelId: viewModel.channelDetail?.id ?? channelId, isRefresh: true)
            }
        }
        .sheet(isPresented: $showRegister) {
            LoginView { showRegister = false; viewModel.subscribe(channelId: channelId) { _ in } }
        }
        .alert("Contraseña", isPresented: $viewModel.showPasswordPrompt) {
            Button("Validar") { viewModel.validatePassword(channelId: channelId) }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Ingresa la contraseña del canal")
        }
        .alert("Desuscribirse", isPresented: $showingUnsubscribeAlert) {
            Button("Cancelar", role: .cancel) { }
            Button("Desuscribirse", role: .destructive) {
                viewModel.unsubscribe(channelId: channelId) { _ in }
            }
        } message: {
            Text("¿Estás seguro de que quieres desuscribirte de este canal?")
        }
        .alert("Lo sentimos", isPresented: $subscribeErrorAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Intenta más tarde.")
        }
    }
}

struct MessageBubble: View {
    let message: Message
    @Environment(\.colorScheme) var colorScheme
    
    var isEmergency: Bool {
        message.isEmergency ?? false
    }
    
    @State private var pulseScale: CGFloat = 1.0
    @State private var hasViewed: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // HEADER
            HStack(alignment: .top, spacing: 12) {
                // Avatar con pulso solo en emergencias
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: isEmergency ? [Color.red, Color.orange] : [Color.blue, Color.purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 44, height: 44)
                        .overlay(
                            Text(message.sender.fullName.prefix(1).uppercased())
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )
                    
                    // Anillo pulsante solo en emergencias
                    if isEmergency {
                        Circle()
                            .stroke(Color.red.opacity(0.5), lineWidth: 3)
                            .frame(width: 52, height: 52)
                            .scaleEffect(pulseScale)
                            .opacity(1.5 - pulseScale) // fade out mientras crece
                    }
                }
                .onAppear {
                    if isEmergency {
                        withAnimation(
                            Animation.easeOut(duration: 1.2)
                                .repeatForever(autoreverses: false)
                        ) {
                            pulseScale = 1.4
                        }
                    }
                    if let url = URL(string: "\(APIConfig.baseURL)/messages/\(message.id)/view") {
                        var req = URLRequest(url: url)
                        req.httpMethod = "POST"
                        if let tok = UserSession.shared.token { req.setValue("Bearer \(tok)", forHTTPHeaderField: "Authorization") }
                        URLSession.shared.dataTask(with: req) { _,_,_ in }.resume()
                    }
                    hasViewed = true
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    // Nombre + badge EMERGENCIA
                    HStack(spacing: 8) {
                        Text(message.sender.fullName)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        if isEmergency {
                            HStack(spacing: 4) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.caption)
                                Text("EMERGENCIA")
                                    .font(.caption2)
                                    .fontWeight(.black)
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(Color.red, in: Capsule())
                        }
                    }
                    
                    HStack(spacing: 6) {
                        Text("@\(message.sender.username)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(message.formattedDate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 8)
            
            // Contenido del mensaje (más grande en emergencias)
            Text(message.content)
                .font(isEmergency ? .title3 : .body)
                .fontWeight(isEmergency ? .semibold : .regular)
                .foregroundColor(.primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            
            // Footer (método + expiración)
            if message.deliveryMethod != nil || message.expiresInString != nil {
                HStack(spacing: 12) {
                    if let deliveryMethod = message.deliveryMethod, deliveryMethod != "BOTH" {
                        Label(deliveryMethod, systemImage: deliveryMethod == "SMS" ? "message.fill" : "bell.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                if let expiresIn = message.expiresInString {
                    Label(expiresIn, systemImage: "clock.fill")
                        .font(.caption)
                        .foregroundColor(expiresIn.contains("expirado") ? .red : .orange)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background((expiresIn.contains("expirado") ? Color.red : Color.orange).opacity(0.1))
                        .cornerRadius(8)
                }
                if let evIn = message.eventInString {
                    Label(evIn, systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.purple)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(8)
                }
                
                Spacer()
            }
                .padding(.horizontal, 16)
                .padding(.bottom, 14)
            } else {
                Spacer().frame(height: 14)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 18)
                .fill(isEmergency
                      ? Color.red.opacity(colorScheme == .dark ? 0.18 : 0.11)
                      : (colorScheme == .dark ? Color(.systemGray6) : Color(.systemBackground)))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(isEmergency ? Color.red.opacity(0.7) : Color.clear, lineWidth: isEmergency ? 1.5 : 0)
        )
        .overlay(alignment: .bottomTrailing) {
            if (hasViewed || (message.viewedByMe ?? false)) {
                HStack(spacing: -2) {
                    Image(systemName: "checkmark")
                    Image(systemName: "checkmark")
                } 
                .font(.caption2)
                .foregroundColor(.gray)
                .padding(.trailing, 8)
                .padding(.bottom, 6)
            }
        }
        .shadow(color: isEmergency ? Color.red.opacity(0.2) : Color.black.opacity(0.05),
                radius: isEmergency ? 10 : 4,
                y: isEmergency ? 4 : 2)
    }
}

struct MessagesView: View {
    var body: some View {
        NavigationView {
            VStack {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                Text("Mensajes")
                    .font(.title2)
                    .padding()
            }
            .navigationTitle("Mensajes")
        }
    }
}

struct SearchView: View {
    @StateObject private var vm = SearchViewModel()
    @State private var query: String = ""
    @FocusState private var focused: Bool
    @State private var debounce: DispatchWorkItem?
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                    TextField("Buscar canales", text: $query)
                        .disableAutocorrection(true)
                        .textInputAutocapitalization(.never)
                        .submitLabel(.search)
                        .focused($focused)
                        .onSubmit { performSearch() }
                        .onChange(of: query) { q in scheduleSearch(q) }
                    Spacer()
                    if vm.isLoading { ProgressView().scaleEffect(0.8) }
                    if !query.isEmpty {
                        Button(action: { query = ""; vm.results = []; focused = false }) {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: 12).fill(Color(.systemGray6)))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(.systemGray4)))
                .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
                .padding(.horizontal)
                .padding(.top, 8)
                if vm.results.isEmpty && !vm.isLoading && !query.isEmpty {
                    Text("No se encontraron canales").foregroundColor(.secondary).padding()
                }
                List {
                    ForEach(vm.results) { ch in
                        NavigationLink(destination: ChannelDetailView(channelId: ch.id, channelTitle: ch.title)) {
                            HStack(spacing: 6) {
                                Image(systemName: ch.icon).foregroundColor(.blue)
                                VStack(alignment: .leading) {
                                    Text(ch.title).font(.subheadline)
                                    Text(ch.description ?? "").font(.caption).foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .listStyle(.plain)
            }
            .navigationTitle("Buscar")
        }
    }
    private func performSearch() { vm.query = query; vm.search() }
    private func scheduleSearch(_ q: String) {
        debounce?.cancel()
        if q.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { vm.results = []; return }
        let work = DispatchWorkItem { performSearch() }
        debounce = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45, execute: work)
    }
}

struct MessageDetailView: View {
    let messageId: String
    var onDismiss: (() -> Void)? = nil
    @Environment(\.dismiss) var dismiss
    @State private var message: Message?
    @State private var channel: ChannelDetail?
    @State private var isLoading = true
    @State private var error: String?
    var body: some View {
        NavigationView {
            Group {
                if isLoading { ProgressView("Cargando mensaje...") }
                else if let error = error { Text(error).foregroundColor(.red) }
                else if let message = message {
                    VStack(spacing: 0) {
                        if let channel = channel {
                            HStack(spacing: 12) {
                                Image(systemName: channel.icon).foregroundColor(.blue)
                                Text(channel.title).font(.headline)
                                Spacer()
                            }
                            .padding()
                        }
                        MessageBubble(message: message)
                            .padding(.horizontal)
                        Spacer()
                    }
                }
            }
            .navigationTitle("Mensaje")
            .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { (onDismiss ?? { dismiss() })() } } }
        }
        .onAppear { load() }
    }
    private func load() {
        guard let url = URL(string: "\(APIConfig.baseURL)/messages/\(messageId)") else { isLoading = false; error = "URL inválida"; return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                isLoading = false
                guard let data = data, let msg = try? JSONDecoder().decode(Message.self, from: data) else { error = "No se pudo cargar el mensaje"; return }
                message = msg
                if let cUrl = URL(string: "\(APIConfig.baseURL)/channels/\(msg.channelId)") {
                    URLSession.shared.dataTask(with: cUrl) { d, _, _ in
                        DispatchQueue.main.async { if let d = d, let det = try? JSONDecoder().decode(ChannelDetail.self, from: d) { channel = det } }
                    }.resume()
                }
            }
        }.resume()
    }
}

class EmergencyMonitor: ObservableObject {
    @Published var isRunning = false
    private var timer: Timer?
    private var knownIds: Set<String> = []
    private var channelIds: [String] = []

    func start() {
        if isRunning { return }
        isRunning = true

        loadSubscriptions { [weak self] ids in
            guard let self = self else { return }
            self.channelIds = ids
            self.pollOnce()
            DispatchQueue.main.async {
                self.timer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
                    self?.pollOnce()
                }
            }
        }
    }

    func stop() {
        isRunning = false
        timer?.invalidate()
        timer = nil
    }




    private func loadSubscriptions(completion: @escaping ([String])->Void) {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/user/\(UserSession.shared.currentUserId)/subscribed") else {
            completion([])
            return
        }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let channels = try? JSONDecoder().decode([Channel].self, from: data) else {
                completion([])
                return
            }
            let ids = channels.filter { $0.parentId != nil }.map { $0.id }
            completion(ids)
        }.resume()
    }

    private func pollOnce() {
        guard !channelIds.isEmpty else { return }
        for cid in channelIds {
            fetchEmergencies(channelId: cid)
        }
    }

    private func fetchEmergencies(channelId: String) {
        guard let url = URL(string: "\(APIConfig.baseURL)/messages/channel/\(channelId)?quick=emergency") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self = self, let data = data else { return }
            if let messages = try? JSONDecoder().decode([Message].self, from: data) {
                for m in messages {
                    if !self.knownIds.contains(m.id) {
                        self.knownIds.insert(m.id)
                        self.notifyEmergency(message: m)
                    }
                }
            }
        }.resume()
    }

    private func notifyEmergency(message: Message) {
        let content = UNMutableNotificationContent()
        content.sound = .default
        content.userInfo = ["messageId": message.id, "channelId": message.channelId]
        let formatted = formatEventShort(message.eventAt)
        let bodyBase = message.content
        content.body = formatted != nil ? "\(bodyBase) • \(formatted!)" : bodyBase
        if UIApplication.shared.applicationState == .active {
            NotificationRouter.shared.targetMessageId = message.id
            return
        }
        if let url = URL(string: "\(APIConfig.baseURL)/channels/\(message.channelId)") {
            URLSession.shared.dataTask(with: url) { data, _, _ in
                guard let data = data, let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) else {
                    content.title = "Emergencia"
                    let req = UNNotificationRequest(identifier: "emergency_\(message.id)", content: content, trigger: nil)
                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                    return
                }
                if let pid = detail.parentId, let purl = URL(string: "\(APIConfig.baseURL)/channels/\(pid)") {
                    URLSession.shared.dataTask(with: purl) { pdata, _, _ in
                        var title = detail.title
                        if let pdata = pdata, let parent = try? JSONDecoder().decode(ChannelDetail.self, from: pdata), let subs = parent.subchannels, !subs.isEmpty {
                            let principal = subs.sorted(by: { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }).first
                            title = parent.title + ((principal?.id == detail.id) ? "" : " • \(detail.title)")
                        }
                        content.title = title
                        let req = UNNotificationRequest(identifier: "emergency_\(message.id)", content: content, trigger: nil)
                        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                    }.resume()
                } else {
                    content.title = detail.title
                    let req = UNNotificationRequest(identifier: "emergency_\(message.id)", content: content, trigger: nil)
                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                }
            }.resume()
        }
    }
}

struct EmergencyEvent: Codable, Identifiable {
    let id: String
    let channelId: String
    let content: String
    let createdAt: String
    let eventAt: String?
}

func formatEventShort(_ iso: String?) -> String? {
    guard let iso = iso, let dt = ISO8601DateFormatter().date(from: iso) else { return nil }
    let fmt = DateFormatter()
    fmt.locale = Locale(identifier: "es")
    fmt.dateFormat = "LLL • EEEE d • h:mm a"
    return fmt.string(from: dt)
}

class EmergencyEmitterClient: ObservableObject {
    @Published var isRunning = false
    private var timer: Timer?
    private var knownIds: Set<String> = []
    private var subscribedSubchannelIds: Set<String> = []
    private let baseURL: String

    init(baseURL: String) {
        self.baseURL = baseURL
    }

    func start() {
        if isRunning { return }
        isRunning = true
        loadSubscribedSubchannels()
        pollOnce()
        DispatchQueue.main.async {
            self.timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
                self?.pollOnce()
            }
        }
    }

    func stop() {
        isRunning = false
        timer?.invalidate()
        timer = nil
    }

    private func loadSubscribedSubchannels() {
        guard let url = URL(string: "\(APIConfig.baseURL)/channels/user/\(UserSession.shared.currentUserId)/subscribed") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let chans = try? JSONDecoder().decode([Channel].self, from: data) else { return }
            let ids = chans.filter { $0.parentId != nil }.map { $0.id }
            DispatchQueue.main.async { self.subscribedSubchannelIds = Set(ids) }
        }.resume()
    }

    private func pollOnce() {
        guard let url = URL(string: "\(baseURL)/events") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self = self, let data = data else { return }
            if let events = try? JSONDecoder().decode([EmergencyEvent].self, from: data) {
                for e in events {
                    if !self.knownIds.contains(e.id) {
                        self.knownIds.insert(e.id)
                        self.notifyEmergency(event: e)
                    }
                }
            }
        }.resume()
    }

    private func notifyEmergency(event: EmergencyEvent) {
        if !subscribedSubchannelIds.contains(event.channelId) { return }
        let subs = PersistenceManager.shared.loadSubscriptions() ?? []
        if let sub = subs.first(where: { $0.channel.id == event.channelId }) {
            let fmt = ISO8601DateFormatter()
            let evDate = fmt.date(from: event.createdAt) ?? fmt.date(from: event.createdAt.replacingOccurrences(of: " ", with: "T"))
            let subDate = fmt.date(from: sub.subscribedAt) ?? fmt.date(from: sub.subscribedAt.replacingOccurrences(of: " ", with: "T"))
            if let s = subDate, let e = evDate, s > e { return }
        } else {
            return
        }
        let content = UNMutableNotificationContent()
        content.sound = .default
        content.userInfo = ["messageId": event.id, "channelId": event.channelId]
        let formatted = formatEventShort(event.eventAt)
        let bodyBase = event.content
        content.body = formatted != nil ? "\(bodyBase) • \(formatted!)" : bodyBase
        if UIApplication.shared.applicationState == .active {
            NotificationRouter.shared.targetMessageId = event.id
            return
        }
        if let url = URL(string: "\(APIConfig.baseURL)/channels/\(event.channelId)") {
            URLSession.shared.dataTask(with: url) { data, _, _ in
                guard let data = data, let detail = try? JSONDecoder().decode(ChannelDetail.self, from: data) else {
                    content.title = "Emergencia"
                    let req = UNNotificationRequest(identifier: "emergency_emitter_\(event.id)", content: content, trigger: nil)
                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                    return
                }
                if let pid = detail.parentId, let purl = URL(string: "\(APIConfig.baseURL)/channels/\(pid)") {
                    URLSession.shared.dataTask(with: purl) { pdata, _, _ in
                        var title = detail.title
                        if let pdata = pdata, let parent = try? JSONDecoder().decode(ChannelDetail.self, from: pdata), let subs = parent.subchannels, !subs.isEmpty {
                            let principal = subs.sorted(by: { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }).first
                            title = parent.title + ((principal?.id == detail.id) ? "" : " • \(detail.title)")
                        }
                        content.title = title
                        let req = UNNotificationRequest(identifier: "emergency_emitter_\(event.id)", content: content, trigger: nil)
                        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                    }.resume()
                } else {
                    content.title = detail.title
                    let req = UNNotificationRequest(identifier: "emergency_emitter_\(event.id)", content: content, trigger: nil)
                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                }
            }.resume()
        }
    }
}

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @AppStorage("app_appearance") private var appAppearance: String = "system"
    @State private var showingUnsubscribeAlert = false
    @State private var channelToUnsubscribe: String?
    @State private var showLogin = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    if viewModel.isLoading {
                        ProgressView("Cargando perfil...")
                            .padding()
                    } else if let profile = viewModel.userProfile {
                        // Header del perfil
                        VStack(spacing: 16) {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [Color.blue, Color.purple],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)
                                .overlay(
                                    Text(profile.fullName?.prefix(1).uppercased() ?? profile.username.prefix(1).uppercased())
                                        .font(.system(size: 40, weight: .bold))
                                        .foregroundColor(.white)
                                )
                            
                            VStack(spacing: 4) {
                                Text(profile.fullName ?? profile.username)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                
                                Text("@\(profile.username)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                
                                if profile.isAdmin {
                                    HStack(spacing: 4) {
                                        Image(systemName: "star.fill")
                                            .font(.caption)
                                        Text("Administrador")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 4)
                                    .background(Color.orange)
                                    .cornerRadius(12)
                                }
                                if !UserSession.shared.isVerified {
                                    HStack(spacing: 4) {
                                        Image(systemName: "person.fill.questionmark")
                                            .font(.caption)
                                        Text("Modo invitado")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 4)
                                    .background(Color.gray)
                                    .cornerRadius(12)
                                }
                            }
                            
                            HStack(spacing: 20) {
                                Label(profile.email, systemImage: "envelope.fill")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                if let phone = profile.phoneNumber {
                                    Label(phone, systemImage: "phone.fill")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemBackground))
                        
                        Divider()

                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "paintbrush")
                                Text("Apariencia")
                                    .font(.headline)
                                Spacer()
                            }
                            .padding(.horizontal)
                            Picker("Apariencia", selection: $appAppearance) {
                                Text("Sistema").tag("system")
                                Text("Claro").tag("light")
                                Text("Oscuro").tag("dark")
                            }
                            .pickerStyle(.segmented)
                            .padding(.horizontal)
                        }
                        .padding(.vertical)
                        
                        // Suscripciones
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Mis Suscripciones")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                
                                Spacer()
                                
                                Text("\(viewModel.subscriptions.count)")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(Color.blue)
                                    .cornerRadius(12)
                            }
                            .padding(.horizontal)
                            .padding(.top)
                            
                            if viewModel.subscriptions.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "bell.slash")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray)
                                    Text("No estás suscrito a ningún canal")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    
                                    NavigationLink(destination: Text("Explorar canales")) {
                                        Label("Explorar canales", systemImage: "magnifyingglass")
                                            .font(.subheadline)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .background(Color.blue)
                                            .foregroundColor(.white)
                                            .cornerRadius(8)
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 40)
                            } else {
                                LazyVStack(spacing: 12) {
                                    ForEach(viewModel.subscriptions) { subscription in
                                        SubscriptionCard(
                                            subscription: subscription,
                                            onUnsubscribe: {
                                                channelToUnsubscribe = subscription.channelId
                                                showingUnsubscribeAlert = true
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.bottom)
                    } else if let error = viewModel.errorMessage {
                        VStack(spacing: 16) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 50))
                                .foregroundColor(.orange)
                            Text("Error")
                                .font(.headline)
                            Text(error)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            Button(action: {
                                viewModel.loadProfile()
                                viewModel.loadSubscriptions()
                            }) {
                                Label("Reintentar", systemImage: "arrow.clockwise")
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Perfil")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if !UserSession.shared.isVerified {
                        Button("Iniciar sesión") { showLogin = true }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.isRefreshing {
                        ProgressView().scaleEffect(0.8)
                    } else {
                        Button(action: {
                            viewModel.loadProfile(isRefresh: true)
                            viewModel.loadSubscriptions(isRefresh: true)
                        }) {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .refreshable {
                await withCheckedContinuation { continuation in
                    viewModel.loadProfile(isRefresh: true)
                    viewModel.loadSubscriptions(isRefresh: true)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        continuation.resume()
                    }
                }
            }
            .onAppear {
                if viewModel.userProfile == nil {
                    viewModel.loadProfile()
                    viewModel.loadSubscriptions()
                } else {
                    viewModel.loadProfile(isRefresh: true)
                    viewModel.loadSubscriptions(isRefresh: true)
                }
            }
            .alert("Desuscribirse", isPresented: $showingUnsubscribeAlert) {
                Button("Cancelar", role: .cancel) { }
                Button("Desuscribirse", role: .destructive) {
                    if let channelId = channelToUnsubscribe {
                        viewModel.unsubscribe(channelId: channelId) { success in
                            if success {
                                // Éxito
                            }
                        }
                    }
                }
            } message: {
                Text("¿Estás seguro de que quieres desuscribirte de este canal? Dejarás de recibir notificaciones.")
            }
            .sheet(isPresented: $showLogin) {
                LoginView {
                    showLogin = false
                    viewModel.loadProfile(isRefresh: true)
                    viewModel.loadSubscriptions(isRefresh: true)
                }
            }
        }
    }
}

struct SubscriptionCard: View {
    let subscription: Subscription
    let onUnsubscribe: () -> Void
    
    var body: some View {
        NavigationLink(destination: ChannelDetailView(channelId: subscription.channelId, channelTitle: subscription.channel.title)) {
            HStack(spacing: 12) {
                Image(systemName: subscription.channel.icon)
                    .font(.title2)
                    .foregroundColor(subscription.channel.isPublic ? .blue : .orange)
                    .frame(width: 40, height: 40)
                    .background(
                        Circle()
                            .fill(subscription.channel.isPublic ? Color.blue.opacity(0.1) : Color.orange.opacity(0.1))
                    )
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(subscription.channel.title)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        if !subscription.channel.isPublic {
                            Image(systemName: "lock.fill")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                    
                    if let description = subscription.channel.description {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Image(systemName: "bell.fill")
                                .font(.caption2)
                            Text("Activo")
                                .font(.caption2)
                        }
                        .foregroundColor(.green)
                    }
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Button(action: onUnsubscribe) {
                    Image(systemName: "bell.slash.fill")
                        .font(.title3)
                        .foregroundColor(.red)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ContentView: View {
    @State private var selectedTab = 0
    @State private var showSplash = true
    @State private var minSplashElapsed = false
    @State private var initialDataReady = false
    @Environment(\.colorScheme) var colorScheme
    @AppStorage("app_appearance") private var appAppearance: String = "system"
    @StateObject private var emergencyMonitor = EmergencyMonitor()
    @StateObject private var emitterClient = EmergencyEmitterClient(baseURL: "http://192.168.3.149:8766")
    @StateObject private var router = NotificationRouter.shared
    @State private var showDeepLink = false
    
    var body: some View {
        ZStack {
            ChannelsView(onInitialDataReady: {
                initialDataReady = true
                if minSplashElapsed {
                    withAnimation(.easeOut(duration: 0.3)) { showSplash = false }
                }
            })
            if showSplash { SplashView().transition(.opacity).zIndex(1) }
        }
        .accentColor(.blue)
        .preferredColorScheme(appAppearance == "dark" ? .dark : (appAppearance == "light" ? .light : nil))
        .onAppear {
            showSplash = true
            UserSession.shared.restoreSession()
            UserSession.shared.ensureGuestSync {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                    if granted {
                        emergencyMonitor.start()
                        emitterClient.start()
                    } else {
                        print("Notificaciones locales no autorizadas")
                    }
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                minSplashElapsed = true
                if initialDataReady {
                    withAnimation(.easeOut(duration: 0.3)) { showSplash = false }
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                if showSplash {
                    withAnimation(.easeOut(duration: 0.3)) { showSplash = false }
                }
            }
        }
        .onDisappear {
            emergencyMonitor.stop()
            emitterClient.stop()
        }
        .sheet(isPresented: $showDeepLink) {
            if let mid = router.targetMessageId {
                MessageDetailView(messageId: mid) { router.reset(); showDeepLink = false }
            }
        }

        .onChange(of: router.targetMessageId) { _ in
            showDeepLink = router.targetMessageId != nil
        }
    }
}
struct SplashView: View {
    @State private var dotOffset: CGFloat = -8
    @State private var dotScale: CGFloat = 1.0
    @State private var lettersOpacity = 0.0
    @State private var lettersScale = 0.8
    @State private var showDot = false
    @State private var glowIntensity = 0.0
    @State private var rotationAngle = 0.0
    
    private let letters = ["T","i","f","y"]
    
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            
            VStack(spacing: 8) {
                HStack(spacing: 0) {
                    ForEach(0..<letters.count, id: \.self) { i in
                        if letters[i] == "i" {
                            ZStack(alignment: .top) {
                                // Letra "i" sin punto
                                Text("ı")
                                    .font(.system(size: 64, weight: .bold, design: .rounded))
                                    .foregroundStyle(
                                        LinearGradient(
                                            colors: [Color.orange, Color.red],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .shadow(color: Color.orange.opacity(glowIntensity), radius: 12, x: 0, y: 0)
                                    .scaleEffect(lettersScale)
                                    .opacity(lettersOpacity)
                                
                                // Punto animado de la "i"
                                if showDot {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.orange, Color.red],
                                                startPoint: .top,
                                                endPoint: .bottom
                                            )
                                        )
                                        .frame(width: 10, height: 10)
                                        .shadow(color: Color.orange.opacity(0.8), radius: 8, x: 0, y: 0)
                                        .scaleEffect(dotScale)
                                        .offset(y: dotOffset)
                                        .rotationEffect(.degrees(rotationAngle))
                                }
                            }
                        } else {
                            Text(letters[i])
                                .font(.system(size: 64, weight: .bold, design: .rounded))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.orange, Color.red],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: Color.orange.opacity(glowIntensity), radius: 12, x: 0, y: 0)
                                .scaleEffect(lettersScale)
                                .opacity(lettersOpacity)
                        }
                    }
                }
            }
        }
        .onAppear {
            startAnimation()
        }
    }
    
    private func startAnimation() {
        // Fase 1: Aparición de letras (0.0 - 0.5s)
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
            lettersOpacity = 1.0
            lettersScale = 1.0
        }
        
        // Fase 2: Mostrar el punto y empezar a saltar (0.3s)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            showDot = true
            startBouncingAnimation()
        }
        
        // Activar el brillo pulsante
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                glowIntensity = 0.4
            }
        }
    }
    
    private func startBouncingAnimation() {
        // Animación de rebote del punto (1.7s de duración total)
        let bounceSequence = [
            (offset: -60.0, scale: 1.2, duration: 0.35, rotation: 0.0),
            (offset: -8.0, scale: 0.8, duration: 0.25, rotation: 180.0),
            (offset: -45.0, scale: 1.15, duration: 0.3, rotation: 360.0),
            (offset: -8.0, scale: 0.85, duration: 0.2, rotation: 540.0),
            (offset: -30.0, scale: 1.1, duration: 0.25, rotation: 720.0),
            (offset: -8.0, scale: 1.0, duration: 0.35, rotation: 720.0)
        ]
        
        var currentDelay = 0.0
        
        for bounce in bounceSequence {
            DispatchQueue.main.asyncAfter(deadline: .now() + currentDelay) {
                withAnimation(.interpolatingSpring(stiffness: 300, damping: 15)) {
                    dotOffset = bounce.offset
                    dotScale = bounce.scale
                    rotationAngle = bounce.rotation
                }
            }
            currentDelay += bounce.duration
        }
    }
}

struct ChannelsView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

struct LoginView: View {
    var onSuccess: (() -> Void)? = nil
    @Environment(\.dismiss) var dismiss
    @State private var phone = ""
    @State private var code = ""
    @State private var stage = 1
    @State private var sending = false
    @State private var info: String? = nil
    @State private var error: String? = nil
    @State private var resendCooldown = 0
    @FocusState private var phoneFocused: Bool
    @FocusState private var codeFocused: Bool
    @State private var activeCodeIndex = 0
    struct Country: Identifiable, Equatable, Hashable {
        let id = UUID()
        let name: String
        let iso: String
        let dialCode: String
        var flag: String {
            let base = 127397
            return iso.uppercased().unicodeScalars.reduce("") { $0 + String(UnicodeScalar(base + Int($1.value))!) }
        }
    }
    let countries: [Country] = [
        Country(name: "Colombia", iso: "CO", dialCode: "+57"),
        Country(name: "Venezuela", iso: "VE", dialCode: "+58"),
        Country(name: "Ecuador", iso: "EC", dialCode: "+593"),
        Country(name: "Perú", iso: "PE", dialCode: "+51"),
        Country(name: "México", iso: "MX", dialCode: "+52"),
        Country(name: "Bolivia", iso: "BO", dialCode: "+591")
    ]
    @State private var selectedCountry: Country = {
        let rc = Locale.current.regionCode ?? "MX"
        let list = [
            Country(name: "Colombia", iso: "CO", dialCode: "+57"),
            Country(name: "Venezuela", iso: "VE", dialCode: "+58"),
            Country(name: "Ecuador", iso: "EC", dialCode: "+593"),
            Country(name: "Perú", iso: "PE", dialCode: "+51"),
            Country(name: "México", iso: "MX", dialCode: "+52"),
            Country(name: "Bolivia", iso: "BO", dialCode: "+591")
        ]
        return list.first(where: { $0.iso == rc }) ?? list.first!
    }()
    private func requestCode() {
        guard !phone.isEmpty else { return }
        let uid = UserSession.shared.currentUserId
        guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/request-verification-code") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let digits = phone.filter { $0.isNumber }
        let body: [String: Any] = ["phoneNumber": selectedCountry.dialCode + digits]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        sending = true
        URLSession.shared.dataTask(with: req) { _, _, _ in
            DispatchQueue.main.async {
                sending = false
                stage = 2
                info = "Te enviamos un código de verificación."
                resendCooldown = 300
                Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
                    resendCooldown = max(0, resendCooldown - 1)
                    if resendCooldown == 0 { t.invalidate() }
                }
            }
        }.resume()
    }
    private func verifyCode() {
        
        guard !phone.isEmpty, !code.isEmpty else { return }
        let uid = UserSession.shared.currentUserId
        guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/register") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let digits = phone.filter { $0.isNumber }
        let body: [String: Any] = ["phoneNumber": selectedCountry.dialCode + digits, "code": code]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        sending = true
        URLSession.shared.dataTask(with: req) { data, response, _ in
            DispatchQueue.main.async {
                sending = false
                if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                   let data = data,
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let token = obj["token"] as? String {
                    UserDefaults.standard.set(token, forKey: "auth_token")
                    UserDefaults.standard.set(true, forKey: "user_is_verified")
                    UserSession.shared.token = token
                    UserSession.shared.isVerified = true
                    onSuccess?(); dismiss()
                } else {
                    error = "Código inválido. Intenta nuevamente."
                }
            }
        }.resume()
    }

    private func dismissKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.check")
                        .font(.system(size: 48))
                        .foregroundColor(.blue)
                    Text("Inicia sesión")
                        .font(.title3).fontWeight(.semibold)
                    Text("Ingresa tu número de teléfono y el código de verificación")
                        .font(.footnote).foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                Form {
                    Section("Número de teléfono") {
                        HStack(spacing: 10) {
                            Menu {
                                ForEach(countries) { c in
                                    Button(action: { selectedCountry = c }) {
                                        HStack { Text(c.flag); Text(c.name); Spacer(); Text(c.dialCode).foregroundColor(.secondary) }
                                    }
                                }
                            } label: {
                                HStack(spacing: 6) {
                                    Text(selectedCountry.flag)
                                    Text(selectedCountry.dialCode)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                            }
                            ZStack {
                                RoundedRectangle(cornerRadius: 8).fill(Color(.systemGray6))
                                HStack {
                                    TextField("300 000 0000", text: $phone)
                                        .keyboardType(.numberPad)
                                        .textContentType(.telephoneNumber)
                                        .focused($phoneFocused)
                                        .onChange(of: phone) { v in phone = v.filter { $0.isNumber } }
                                    Button(action: {
                                        let text = UIPasteboard.general.string ?? ""
                                        let digits = text.filter { $0.isNumber }
                                        if !digits.isEmpty { phone = digits; phoneFocused = true }
                                    }) {
                                        Image(systemName: "doc.on.clipboard")
                                            .imageScale(.small)
                                            .foregroundColor(.secondary)
                                    }
                                    if !phone.isEmpty {
                                        Button(action: { phone = "" }) {
                                            Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                                        }
                                    }
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 8)
                                .contextMenu {
                                    Button {
                                        let text = UIPasteboard.general.string ?? ""
                                        let digits = text.filter { $0.isNumber }
                                        if !digits.isEmpty { phone = digits; phoneFocused = true }
                                    } label: {
                                        Label("Pegar", systemImage: "doc.on.clipboard")
                                    }
                                }
                            }
                        }
                        .contentShape(Rectangle())
                        .highPriorityGesture(TapGesture().onEnded { phoneFocused = true })
                    }
                    if stage == 1 {
                        Button(action: requestCode) {
                            HStack { if sending { ProgressView() }; Image(systemName: "paperplane.fill"); Text("Enviar código").fontWeight(.semibold) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.blue)
                        .frame(maxWidth: .infinity)
                        .disabled(phone.isEmpty || sending)
                    } else {
                        Section("Código") {
                            if let info = info { Text(info).font(.footnote).foregroundColor(.secondary) }
                            ZStack {
                                HStack(spacing: 8) {
                                    ForEach(0..<6, id: \.self) { i in
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(i == code.count ? Color.blue : Color.gray.opacity(0.3), lineWidth: 1)
                                                .frame(width: 44, height: 52)
                                            Text(i < code.count ? String(code[code.index(code.startIndex, offsetBy: i)]) : "")
                                                .font(.title3)
                                        }
                                        .scaleEffect(activeCodeIndex == i ? 1.08 : 1.0)
                                        .animation(.spring(response: 0.22, dampingFraction: 0.8), value: activeCodeIndex)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .center)
                                .contentShape(Rectangle())
                                .onTapGesture { codeFocused = true }
                                .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in codeFocused = true })
                                .contextMenu {
                                    Button {
                                        let text = UIPasteboard.general.string ?? ""
                                        let clean = String(text.filter { $0.isNumber }.prefix(6))
                                        if !clean.isEmpty {
                                            code = clean
                                            withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) { activeCodeIndex = min(clean.count, 5) }
                                        }
                                    } label: {
                                        Label("Pegar", systemImage: "doc.on.clipboard")
                                    }
                                }
                                TextField("", text: $code)
                                    .keyboardType(.numberPad)
                                    .textContentType(.oneTimeCode)
                                    .focused($codeFocused)
                                    .onChange(of: code) { v in
                                        let clean = String(v.filter { $0.isNumber }.prefix(6))
                                        code = clean
                                        withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) {
                                            activeCodeIndex = min(clean.count, 5)
                                        }
                                    }
                                    .frame(width: 1, height: 1)
                                    .opacity(0.01)
                            }
                            if let e = error { Text(e).foregroundColor(.red) }
                            Button(action: verifyCode) {
                                HStack { if sending { ProgressView() }; Image(systemName: "checkmark.seal.fill"); Text("Verificar").fontWeight(.semibold) }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            .frame(maxWidth: .infinity)
                            .disabled(code.count < 6 || sending)
                            HStack {
                                Button(action: { if resendCooldown == 0 { requestCode() } }) {
                                    Label(resendCooldown == 0 ? "Reenviar código" : "Reenviar en \(resendCooldown)s", systemImage: "clock")
                                }
                                .disabled(resendCooldown > 0)
                                Spacer()
                                Button(action: {
                                    let text = UIPasteboard.general.string ?? ""
                                    let clean = String(text.filter { $0.isNumber }.prefix(6))
                                    if !clean.isEmpty {
                                        code = clean
                                        withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) { activeCodeIndex = min(clean.count, 5) }
                                    }
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "doc.on.clipboard").imageScale(.small).foregroundColor(.secondary)
                                        Text("Pegar código").foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Iniciar sesión")
            .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { dismiss() } } }
            .simultaneousGesture(TapGesture().onEnded { phoneFocused = false; codeFocused = false; dismissKeyboard() })
        }
    }
}

struct ComposeMessageView: View {
    let channelId: String
    var onSent: ()->Void
    @Environment(\.dismiss) var dismiss
    @State private var content = ""
    @State private var category = "GENERAL"
    @State private var isImmediate = false
    @State private var priority = "MEDIUM"
    @State private var deliveryMethod = "PUSH"
    @State private var useEvent = false
    @State private var eventDate = Date().addingTimeInterval(3600)
    @State private var sending = false
    @State private var error: String?

    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextEditor(text: $content)
                        .frame(minHeight: 100, maxHeight: 180)
                }
                Section {
                    Picker("Categoría", selection: $category) { Text("GENERAL").tag("GENERAL"); Text("INFORMATIVO").tag("INFORMATIVO"); Text("EMERGENTE").tag("EMERGENTE") }
                    Toggle("Inmediato", isOn: $isImmediate)
                    Picker("Prioridad", selection: $priority) { Text("LOW").tag("LOW"); Text("MEDIUM").tag("MEDIUM"); Text("HIGH").tag("HIGH") }
                    Picker("Entrega", selection: $deliveryMethod) { Text("PUSH").tag("PUSH"); Text("SMS").tag("SMS"); Text("WHATSAPP").tag("WHATSAPP"); Text("EMAIL").tag("EMAIL") }
                }
                Section {
                    Toggle("Programar evento", isOn: $useEvent)
                    if useEvent { DatePicker("Fecha", selection: $eventDate, displayedComponents: [.date, .hourAndMinute]) }
                }
                if let error = error { Text(error).foregroundColor(.red) }
            }
            .navigationTitle("Nuevo mensaje")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { dismiss() } }
                ToolbarItem(placement: .navigationBarTrailing) { if sending { ProgressView() } else { Button("Enviar") { send() } } }
            }
        }
    }

    func send() {
        error = nil
        guard !content.isEmpty else { error = "Contenido requerido"; return }
        if isImmediate && category != "EMERGENTE" { error = "Inmediato solo en EMERGENTE"; return }
        sending = true
        let catId: String = {
            switch category { case "GENERAL": return CategoryIds.general; case "INFORMATIVO": return CategoryIds.informativo; default: return CategoryIds.emergente }
        }()
        let url = URL(string: "\(APIConfig.baseURL)/messages")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = [
            "channelId": channelId,
            "senderId": UserSession.shared.currentUserId,
            "categoryId": catId,
            "content": content,
            "priority": priority,
            "isImmediate": isImmediate,
            "isEmergency": category == "EMERGENTE",
            "deliveryMethod": deliveryMethod,
            "durationSeconds": 120
        ]
        if useEvent {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withDashSeparatorInDate, .withColonSeparatorInTime, .withTimeZone]
            payload["eventAt"] = iso.string(from: eventDate)
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: req) { data, response, error in
            DispatchQueue.main.async {
                sending = false
                if error == nil, let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                    if category == "EMERGENTE", let data = data,
                       let msg = try? JSONDecoder().decode(Message.self, from: data) {
                        let c = UNMutableNotificationContent()
                        c.sound = .default
                        c.body = (msg.eventInString != nil) ? "\(msg.content) • \(msg.eventInString!)" : msg.content
                        c.userInfo = ["messageId": msg.id, "channelId": msg.channelId]
                        if let url = URL(string: "\(APIConfig.baseURL)/channels/\(msg.channelId)") {
                            URLSession.shared.dataTask(with: url) { d, _, _ in
                                guard let d = d, let detail = try? JSONDecoder().decode(ChannelDetail.self, from: d) else {
                                    c.title = "Emergencia"
                                    let req = UNNotificationRequest(identifier: "emergency_sent_\(msg.id)", content: c, trigger: nil)
                                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                                    return
                                }
                                if let pid = detail.parentId, let purl = URL(string: "\(APIConfig.baseURL)/channels/\(pid)") {
                                    URLSession.shared.dataTask(with: purl) { pd, _, _ in
                                        var title: String = detail.title
                                        if let pd = pd, let parent = try? JSONDecoder().decode(ChannelDetail.self, from: pd) {
                                            if let subs = parent.subchannels, !subs.isEmpty {
                                                let principal = subs.sorted(by: { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }).first
                                                title = (principal?.id == detail.id) ? parent.title : "\(parent.title) • \(detail.title)"
                                            } else {
                                                title = "\(parent.title) • \(detail.title)"
                                            }
                                        }
                                        c.title = title
                                        let req = UNNotificationRequest(identifier: "emergency_sent_\(msg.id)", content: c, trigger: nil)
                                        UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                                    }.resume()
                                } else {
                                    c.title = detail.title
                                    let req = UNNotificationRequest(identifier: "emergency_sent_\(msg.id)", content: c, trigger: nil)
                                    UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                                }
                            }.resume()
                        } else {
                            c.title = "Emergencia"
                            let req = UNNotificationRequest(identifier: "emergency_sent_\(msg.id)", content: c, trigger: nil)
                            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
                        }
                    }
                    dismiss()
                    onSent()
                } else {
                    self.error = "Error enviando mensaje"
                }
            }
        }.resume()
    }
}
