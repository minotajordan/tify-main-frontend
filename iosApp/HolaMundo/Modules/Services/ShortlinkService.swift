import Foundation

// MARK: - Models

struct ShortLink: Codable, Identifiable {
    let id: String
    let targetUrl: String
    let shortUrl: String
    let shortCode: String
    let redirectMode: RedirectMode
    let activeFrom: String?
    let expiresAt: String?
    let interstitialTitle: String?
    let interstitialMessage: String?
    let bannerImageUrl: String?
    let scanCount: Int
    let createdBy: String?
    let createdAt: String
    let qr: QrInfo?
    
    enum RedirectMode: String, Codable, CaseIterable {
        case immediate = "IMMEDIATE"
        case interstitial = "INTERSTITIAL"
        
        var displayName: String {
            switch self {
            case .immediate: return "Inmediato"
            case .interstitial: return "Intersticial (Página intermedia)"
            }
        }
    }
    
    struct QrInfo: Codable {
        let id: String
        let qrData: String
        let format: String
    }
}

struct CreateShortLinkRequest: Codable {
    let targetUrl: String
    let redirectMode: ShortLink.RedirectMode
    let interstitialTitle: String?
    let interstitialMessage: String?
    let bannerImageUrl: String?
    let activeFrom: String?
    let expiresAt: String?
    let generateQr: Bool
}

struct UpdateShortLinkRequest: Codable {
    let targetUrl: String?
    let redirectMode: ShortLink.RedirectMode?
    let interstitialTitle: String?
    let interstitialMessage: String?
    let bannerImageUrl: String?
    let isActive: Bool?
    let activeFrom: String?
    let expiresAt: String?
}

struct ShortLinkHistory: Codable, Identifiable {
    let id: String
    let changeType: String
    let changedAt: String
    // Simplified for now, backend sends previous/new values as JSON
}

// MARK: - Service

class ShortlinkService {
    static let shared = ShortlinkService()
    private let session = URLSession.shared
    
    private var baseURL: String { APIConfig.baseURL }
    
    private init() {}
    
    func fetchShortlinks(page: Int = 1, limit: Int = 20, search: String? = nil) async throws -> [ShortLink] {
        var components = URLComponents(string: "\(baseURL)/shortlinks")!
        var queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "limit", value: String(limit))
        ]
        if let search = search, !search.isEmpty {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        components.queryItems = queryItems
        
        guard let url = components.url else { throw NetworkError.invalidURL }
        
        let (data, response) = try await session.data(from: url)
        try validateResponse(response)
        
        let decoder = JSONDecoder()
        // Backend returns { items: [], pagination: {} }
        struct ListResponse: Codable {
            let items: [ShortLink]
        }
        
        return try decoder.decode(ListResponse.self, from: data).items
    }
    
    func createShortlink(_ request: CreateShortLinkRequest) async throws -> ShortLink {
        guard let url = URL(string: "\(baseURL)/shortlinks") else { throw NetworkError.invalidURL }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth header if needed (using placeholder for now or static user from APIConfig if accessible)
        // Assuming APIConfig.currentUserId is for reading, but for auth we usually need a token.
        // For now, we'll proceed without explicit token handling in this snippet unless required.
        
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        try validateResponse(response)
        
        return try JSONDecoder().decode(ShortLink.self, from: data)
    }
    
    func updateShortlink(id: String, request: UpdateShortLinkRequest) async throws -> ShortLink {
        guard let url = URL(string: "\(baseURL)/shortlinks/\(id)") else { throw NetworkError.invalidURL }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "PATCH"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await session.data(for: urlRequest)
        try validateResponse(response)
        
        return try JSONDecoder().decode(ShortLink.self, from: data)
    }
    
    func getHistory(id: String) async throws -> [ShortLinkHistory] {
        guard let url = URL(string: "\(baseURL)/shortlinks/\(id)/history") else { throw NetworkError.invalidURL }
        
        let (data, response) = try await session.data(from: url)
        try validateResponse(response)
        
        return try JSONDecoder().decode([ShortLinkHistory].self, from: data)
    }
    
    private func validateResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }
    }
}
