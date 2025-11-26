import SwiftUI

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

