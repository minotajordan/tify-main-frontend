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
    let isSubscribed: Bool?
    
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
    @Published var isVerified: Bool = false
    @Published var token: String? = nil

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
}

// MARK: - ViewModels
class ChannelsViewModel: ObservableObject {
    @Published var channels: [Channel] = []
    @Published var favorites: [Channel] = []
    @Published var isLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    
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
                    PersistenceManager.shared.saveChannels(newChannels)
                } catch {
                    if self?.channels.isEmpty ?? true {
                        self?.errorMessage = "Error al parsear datos: \(error.localizedDescription)"
                    }
                    print("Error detallado: \(error)")
                }
            }
        }.resume()
    }

    func loadSubscribedChannels(isRefresh: Bool = false) {
        if isRefresh {
            isRefreshing = true
        } else {
            isLoading = channels.isEmpty
        }

        errorMessage = nil

        guard let url = URL(string: "\(APIConfig.baseURL)/channels/user/\(UserSession.shared.currentUserId)/subscribed") else {
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
                    PersistenceManager.shared.saveChannels(newChannels)
                } catch {
                    if self?.channels.isEmpty ?? true {
                        self?.errorMessage = "Error al parsear datos: \(error.localizedDescription)"
                    }
                    print("Error detallado: \(error)")
                }
            }
        }.resume()
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
                        c = Channel(id: c.id, title: c.title, description: c.description, icon: c.icon, memberCount: c.memberCount, parentId: c.parentId, isPublic: c.isPublic, isSubscribed: c.isSubscribed, isFavorite: makeFavorite, subchannels: c.subchannels)
                        self?.channels[idx] = c
                    }
                    self?.loadFavorites()
                }
            }
        }.resume()
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
                           let defaultId = subs.sorted { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }.first?.id {
                            self?.isPrimarySubchannel = (newDetail.id == defaultId)
                        }
                    } else if let subs = newDetail.subchannels, !subs.isEmpty {
                        let defaultSub = subs.sorted { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }.first
                        if let sub = defaultSub { self?.loadSubchannelDetail(sub.id) }
                    }
                } catch {
                    if self?.channelDetail == nil {
                        self?.errorMessage = "Error al parsear datos: \(error.localizedDescription)"
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
    @StateObject private var viewModel = ChannelsViewModel()
    @ObservedObject private var session = UserSession.shared
    @State private var searchText = ""
    @State private var referenceCode = ""
    @State private var searching = false
    @State private var searchError: String?
    @State private var showSearchOverlay = false
    @State private var isSearchMode = false // NUEVO: para diferenciar vista normal vs búsqueda
    @State private var showInlineSearch = false
    
    var body: some View {
        NavigationView {
            ZStack(alignment: .top) {
                if viewModel.isLoading {
                    ProgressView("Cargando canales...")
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
                    // MEJORADO: Mensaje cuando no hay suscripciones
                    VStack(spacing: 16) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No estás suscrito a ningún canal")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Usa la búsqueda para encontrar canales")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Button(action: {
                            showSearchOverlay = true
                        }) {
                            Label("Buscar canales", systemImage: "magnifyingglass")
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                } else {
                    ScrollView {
                        // NUEVO: Indicador de modo búsqueda
                        if isSearchMode {
                            HStack {
                                Image(systemName: "magnifyingglass")
                                    .foregroundColor(.blue)
                                Text("Resultados de búsqueda")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Button("Ver mis canales") {
                                    isSearchMode = false
                                    searchText = ""
                                    referenceCode = ""
                                    viewModel.loadSubscribedChannels(isRefresh: true)
                                }
                                .font(.caption)
                            }
                            .padding(.horizontal)
                            .padding(.top, 8)
                        }
                        
                        if !viewModel.favorites.isEmpty && !isSearchMode {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Image(systemName: "star.fill").foregroundColor(.yellow)
                                    Text("Favoritos")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal)
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
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            .padding(.top, 8)
                        }
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.channels.filter { $0.parentId == nil }) { channel in
                                ChannelCard(channel: channel, isSearchMode: isSearchMode)
                                    .environmentObject(viewModel)
                            }
                        }
                        .padding()
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
            }
            .navigationTitle(isSearchMode ? "Búsqueda" : "Canales")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack(spacing: 8) {
                        if showInlineSearch {
                            HStack(spacing: 6) {
                                Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                                TextField("Buscar canales", text: $searchText)
                                    .textFieldStyle(PlainTextFieldStyle())
                                    .onChange(of: searchText) { newValue in
                                        let q = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
                                        if q.isEmpty {
                                            isSearchMode = false
                                            viewModel.loadSubscribedChannels(isRefresh: true)
                                        } else {
                                            searchChannels()
                                        }
                                    }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(Color(.systemGray6)))
                        } else {
                            Button(action: { showInlineSearch = true }) {
                                HStack(spacing: 6) {
                                    Image(systemName: "magnifyingglass")
                                    Text("Buscar canales").font(.footnote)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Capsule().fill(Color(.systemGray6)))
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        Button(action: {
                            showSearchOverlay = true
                        }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                        }
                        
                        if viewModel.isRefreshing {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Button(action: {
                                if isSearchMode {
                                    isSearchMode = false
                                    searchText = ""
                                    referenceCode = ""
                                }
                                viewModel.loadSubscribedChannels(isRefresh: true)
                            }) {
                                Image(systemName: isSearchMode ? "house" : "arrow.clockwise")
                            }
                        }
                    }
                }
            }
            .onAppear {
                UserSession.shared.ensureGuest()
                UserSession.shared.syncAPNSTokenIfAvailable()
                if !session.currentUserId.isEmpty {
                    viewModel.loadSubscribedChannels(isRefresh: true)
                    viewModel.loadFavorites()
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                        if !session.currentUserId.isEmpty {
                            viewModel.loadSubscribedChannels(isRefresh: true)
                            viewModel.loadFavorites()
                            UserSession.shared.syncAPNSTokenIfAvailable()
                        }
                    }
                }
                if false { }
            }
            .onChange(of: session.currentUserId) { newId in
                if !newId.isEmpty {
                    viewModel.loadSubscribedChannels(isRefresh: true)
                    viewModel.loadFavorites()
                    UserSession.shared.syncAPNSTokenIfAvailable()
                }
            }
            .sheet(isPresented: $showSearchOverlay) {
                SearchOverlay(
                    onDismiss: { showSearchOverlay = false },
                    onSearchResults: { results in
                        viewModel.channels = results
                        isSearchMode = true
                    }
                )
            }
        }
    }

    func searchChannels() {
        searching = true
        searchError = nil
        isSearchMode = true
        
        let code = referenceCode.trimmingCharacters(in: .whitespacesAndNewlines)
        if !code.isEmpty {
            guard let url = URL(string: "\(APIConfig.baseURL)/channels/search?referenceCode=\(code)") else {
                searching = false
                return
            }
            
            URLSession.shared.dataTask(with: url) { data, response, error in
                DispatchQueue.main.async {
                    self.searching = false
                    
                    if let error = error {
                        self.searchError = "Error de búsqueda: \(error.localizedDescription)"
                        return
                    }
                    
                    guard let data = data else {
                        self.searchError = "No se recibieron datos"
                        return
                    }
                    
                    do {
                        let items = try JSONDecoder().decode([Channel].self, from: data)
                        self.viewModel.channels = items
                        
                        if items.isEmpty {
                            self.searchError = "No se encontró ningún canal con ese código"
                        }
                    } catch {
                        self.searchError = "Error al procesar resultados"
                        print("Error detallado: \(error)")
                    }
                }
            }.resume()
            return
        }
        
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty {
            searching = false
            isSearchMode = false
            viewModel.loadSubscribedChannels(isRefresh: true)
            return
        }
        
        guard let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(APIConfig.baseURL)/channels/search?q=\(encoded)") else {
            searching = false
            return
        }
        
        URLSession.shared.dataTask(with: url) { data, _, _ in
            DispatchQueue.main.async {
                self.searching = false
                guard let data = data else { return }
                if let items = try? JSONDecoder().decode([Channel].self, from: data) {
                    self.viewModel.channels = items
                    
                    if items.isEmpty {
                        self.searchError = "No se encontraron canales con '\(q)'"
                    }
                }
            }
        }.resume()
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
                        .sorted { $0.memberCount > $1.memberCount }
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
                        Text("\(channel.memberCount)")
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
    @EnvironmentObject var channelsVM: ChannelsViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            NavigationLink(destination: ChannelDetailView(channelId: channel.id, channelTitle: channel.title)) {
                HStack(spacing: 12) {
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
                            
                            if (channel.isSubscribed ?? false) {
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
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 4) {
                            Image(systemName: "person.2.fill")
                                .font(.caption2)
                            Text("\(channel.memberCount)")
                                .font(.caption)
                        }
                        .foregroundColor(.secondary)
                        
                        if let subchannels = channel.subchannels, !subchannels.isEmpty {
                            Button(action: {
                                withAnimation(.spring(response: 0.3)) {
                                    isExpanded.toggle()
                                }
                            }) {
                                Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                                    .foregroundColor(.blue)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        Button(action: {
                            channelsVM.toggleFavorite(channelId: channel.id, makeFavorite: !(channel.isFavorite ?? false))
                        }) {
                            Image(systemName: (channel.isFavorite ?? false) ? "star.fill" : "star")
                                .foregroundColor(.yellow)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
            }
            .buttonStyle(PlainButtonStyle())
            
            if false {
                EmptyView()
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
                    Text("\(subchannel.memberCount)")
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
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
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
                                Text("\(detail.memberCount) miembros")
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
                                Button(action: { if UserSession.shared.isVerified { viewModel.subscribe(channelId: detail.id) { _ in } } else { showRegister = true } }) { Label("Suscribirse", systemImage: "bell.badge") }
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
                                Button(action: { if UserSession.shared.isVerified { viewModel.subscribe(channelId: detail.id) { _ in } } else { showRegister = true } }) { Label("Suscribirse", systemImage: "bell.badge") }
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
        }
        .sheet(isPresented: $viewModel.showCompose) {
            ComposeMessageView(channelId: viewModel.channelDetail?.id ?? channelId) {
                viewModel.loadChannelDetail(channelId: viewModel.channelDetail?.id ?? channelId, isRefresh: true)
            }
        }
        .sheet(isPresented: $showRegister) {
            NavigationView {
                VStack(spacing: 16) {
                    VStack(spacing: 8) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 48))
                            .foregroundColor(.blue)
                        Text("Crear tu cuenta")
                            .font(.title3)
                            .fontWeight(.semibold)
                        Text("Ingresa tus datos básicos para registrarte y recibir un código de verificación.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    Form {
                        Section(header: Text("Tu información")) {
                            TextField("Teléfono", text: $regPhone).keyboardType(.phonePad)
                            TextField("Usuario", text: $regUsername).autocapitalization(.none)
                            TextField("Nombre", text: $regFullName)
                            TextField("Avatar URL (opcional)", text: $regAvatar).autocapitalization(.none)
                        }
                        if regStage == 1 {
                            Button(action: {
                                regError = nil
                                regSending = true
                                let uid = UserSession.shared.currentUserId
                                guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/request-verification-code") else { regSending = false; return }
                                var req = URLRequest(url: url)
                                req.httpMethod = "POST"
                                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                                let body: [String: Any] = [
                                    "phoneNumber": regPhone,
                                    "username": regUsername,
                                    "fullName": regFullName,
                                    "avatarUrl": regAvatar.isEmpty ? NSNull() : regAvatar
                                ]
                                req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                                URLSession.shared.dataTask(with: req) { _, _, _ in
                                    DispatchQueue.main.async {
                                        regSending = false
                                        regStage = 2
                                        regInfo = "Te enviamos un código de verificación. Ingresa el código para completar tu registro."
                                    }
                                }.resume()
                            }) {
                                HStack(spacing: 8) {
                                    if regSending { ProgressView() }
                                    Image(systemName: "person.badge.plus")
                                    Text("Crear")
                                        .fontWeight(.semibold)
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.blue)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .disabled(regPhone.isEmpty || regUsername.isEmpty || regFullName.isEmpty || regSending)
                        } else {
                            Section(header: Text("Verificación")) {
                                if let info = regInfo { Text(info).font(.footnote).foregroundColor(.secondary) }
                                TextField("Código recibido", text: $regCode).keyboardType(.numberPad)
                                if let e = regError { Text(e).foregroundColor(.red) }
                                Button(action: {
                                    regError = nil
                                    regSending = true
                                    let uid = UserSession.shared.currentUserId
                                    guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/register") else { regSending = false; return }
                                    var req = URLRequest(url: url)
                                    req.httpMethod = "POST"
                                    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                                    let body: [String: Any] = [
                                        "phoneNumber": regPhone,
                                        "username": regUsername,
                                        "fullName": regFullName,
                                        "avatarUrl": regAvatar.isEmpty ? NSNull() : regAvatar,
                                        "code": regCode
                                    ]
                                    req.httpBody = try? JSONSerialization.data(withJSONObject: body)
                                    URLSession.shared.dataTask(with: req) { data, response, _ in
                                        DispatchQueue.main.async {
                                            regSending = false
                                            if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                                               let data = data,
                                               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                                               let token = obj["token"] as? String {
                                                UserSession.shared.token = token
                                                UserSession.shared.isVerified = true
                                                showRegister = false
                                                viewModel.subscribe(channelId: channelId) { _ in }
                                            } else {
                                                regError = "No se pudo verificar. Revisa el código."
                                            }
                                        }
                                    }.resume()
                                }) {
                                    HStack(spacing: 8) {
                                        if regSending { ProgressView() }
                                        Image(systemName: "checkmark.seal")
                                        Text("Verificar y suscribirme")
                                            .fontWeight(.semibold)
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.green)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                                .disabled(regCode.isEmpty || regSending)
                                Button("Reenviar código") {
                                    let uid = UserSession.shared.currentUserId
                                    guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/request-verification-code") else { return }
                                    var req = URLRequest(url: url)
                                    req.httpMethod = "POST"
                                    URLSession.shared.dataTask(with: req) { _, _, _ in
                                        DispatchQueue.main.async { regInfo = "Te enviamos un nuevo código." }
                                    }.resume()
                                }
                            }
                        }
                    }
                }
                .navigationTitle("Crear cuenta")
                .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { showRegister = false } } }
        }
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
    }
}

struct MessageBubble: View {
    let message: Message
    @Environment(\.colorScheme) var colorScheme
    
    var isEmergency: Bool {
        message.isEmergency ?? false
    }
    
    @State private var pulseScale: CGFloat = 1.0
    
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
        guard let url = URL(string: "\(APIConfig.baseURL)/subscriptions/user/\(UserSession.shared.currentUserId)") else {
            completion([])
            return
        }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data, let subs = try? JSONDecoder().decode([Subscription].self, from: data) else {
                completion([])
                return
            }
            let ids = subs.map { $0.channelId }
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
                            let principal = subs.sorted { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }.first
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
    private let baseURL: String

    init(baseURL: String) {
        self.baseURL = baseURL
    }

    func start() {
        if isRunning { return }
        isRunning = true
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
                            let principal = subs.sorted { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }.first
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
                            Image(systemName: "person.2.fill")
                                .font(.caption2)
                            Text("\(subscription.channel.memberCount)")
                                .font(.caption2)
                        }
                        
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
    @Environment(\.colorScheme) var colorScheme
    @AppStorage("app_appearance") private var appAppearance: String = "system"
    @StateObject private var emergencyMonitor = EmergencyMonitor()
    @StateObject private var emitterClient = EmergencyEmitterClient(baseURL: "http://192.168.3.149:8766")
    @StateObject private var router = NotificationRouter.shared
    @State private var showDeepLink = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ChannelsView()
                .tabItem {
                    Image(systemName: "bubble.left.and.bubble.right")
                    Text("Canales")
                }
                .tag(0)
            
            MessagesView()
                .tabItem {
                    Image(systemName: "paperplane")
                    Text("Mensajes")
                }
                .tag(1)
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person.circle")
                    Text("Perfil")
                }
                .tag(2)
        }
        .accentColor(.blue)
        .preferredColorScheme(appAppearance == "dark" ? .dark : (appAppearance == "light" ? .light : nil))
        .onAppear {
            UserSession.shared.ensureGuest()
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                if granted {
                    emergencyMonitor.start()
                    emitterClient.start()
                } else {
                    print("Notificaciones locales no autorizadas")
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

struct ChannelsView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
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
                                                let principal = subs.sorted { ($0.memberCount ?? 0) > ($1.memberCount ?? 0) }.first
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
