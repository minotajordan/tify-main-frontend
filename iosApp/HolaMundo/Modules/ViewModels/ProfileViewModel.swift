import SwiftUI

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

