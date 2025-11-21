import Foundation

// MARK: - Models
struct ChannelResponse: Codable {
    let id: String
    let title: String
    let description: String?
    let icon: String
    let parentId: String?
    let ownerId: String
    let isPublic: Bool
    let memberCount: Int
    let isSubscribed: Bool?
    let owner: UserInfo?
    let subchannels: [SubchannelInfo]?
    let messages: [MessageResponse]?
    
    struct UserInfo: Codable {
        let id: String
        let username: String
        let fullName: String?
    }
    
    struct SubchannelInfo: Codable {
        let id: String
        let title: String
        let icon: String
        let memberCount: Int?
    }
}

struct MessageResponse: Codable {
    let id: String
    let channelId: String
    let senderId: String
    let content: String
    let durationSeconds: Int
    let isEmergency: Bool
    let deliveryMethod: String
    let createdAt: String
    let sender: SenderInfo?
    
    struct SenderInfo: Codable {
        let id: String
        let username: String
        let fullName: String?
    }
}

struct UserProfileResponse: Codable {
    let id: String
    let email: String
    let username: String
    let fullName: String?
    let phoneNumber: String?
    let isAdmin: Bool
}

struct PasswordValidationRequest: Codable {
    let password: String
}

struct PasswordValidationResponse: Codable {
    let valid: Bool
}

// MARK: - Network Service
class NetworkService {
    static let shared = NetworkService()
    
    private let baseURL = "http://localhost:3000/api"
    private let session: URLSession
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    // MARK: - Channels
    
    /// Obtiene todos los canales disponibles
    func fetchChannels(userId: String? = nil, search: String? = nil, isPublic: Bool? = nil) async throws -> [ChannelResponse] {
        var components = URLComponents(string: "\(baseURL)/channels")!
        var queryItems: [URLQueryItem] = []
        
        if let userId = userId {
            queryItems.append(URLQueryItem(name: "userId", value: userId))
        }
        if let search = search {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        if let isPublic = isPublic {
            queryItems.append(URLQueryItem(name: "isPublic", value: String(isPublic)))
        }
        
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        
        guard let url = components.url else {
            throw NetworkError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([ChannelResponse].self, from: data)
    }
    
    /// Obtiene un canal específico por ID
    func fetchChannel(id: String, userId: String? = nil) async throws -> ChannelResponse {
        var components = URLComponents(string: "\(baseURL)/channels/\(id)")!
        
        if let userId = userId {
            components.queryItems = [URLQueryItem(name: "userId", value: userId)]
        }
        
        guard let url = components.url else {
            throw NetworkError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(ChannelResponse.self, from: data)
    }
    
    /// Obtiene los canales suscritos de un usuario
    func fetchSubscribedChannels(userId: String) async throws -> [ChannelResponse] {
        guard let url = URL(string: "\(baseURL)/channels/user/\(userId)/subscribed") else {
            throw NetworkError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([ChannelResponse].self, from: data)
    }
    
    /// Valida la contraseña de un canal privado
    func validateChannelPassword(channelId: String, password: String) async throws -> Bool {
        guard let url = URL(string: "\(baseURL)/channels/\(channelId)/validate-password") else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = PasswordValidationRequest(password: password)
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let result = try JSONDecoder().decode(PasswordValidationResponse.self, from: data)
        return result.valid
    }
}

// MARK: - Network Errors
enum NetworkError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError
    case noData
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL inválida"
        case .invalidResponse:
            return "Respuesta inválida del servidor"
        case .httpError(let statusCode):
            return "Error HTTP: \(statusCode)"
        case .decodingError:
            return "Error al decodificar datos"
        case .noData:
            return "No se recibieron datos"
        }
    }
}
