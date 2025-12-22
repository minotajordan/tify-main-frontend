import Foundation
import Combine

@MainActor
class ShortlinksViewModel: ObservableObject {
    @Published var shortlinks: [ShortLink] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var searchText = ""
    
    private var cancellables = Set<AnyCancellable>()
    private let service = ShortlinkService.shared
    
    init() {
        $searchText
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] _ in
                Task { await self?.fetchShortlinks() }
            }
            .store(in: &cancellables)
    }
    
    func fetchShortlinks() async {
        isLoading = true
        errorMessage = nil
        do {
            shortlinks = try await service.fetchShortlinks(search: searchText)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    func createShortlink(
        targetUrl: String,
        mode: ShortLink.RedirectMode,
        title: String?,
        message: String?,
        bannerUrl: String?,
        activeFrom: Date?,
        expiresAt: Date?
    ) async -> Bool {
        isLoading = true
        errorMessage = nil
        
        let formatter = ISO8601DateFormatter()
        let activeFromStr = activeFrom.map { formatter.string(from: $0) }
        let expiresAtStr = expiresAt.map { formatter.string(from: $0) }
        
        let request = CreateShortLinkRequest(
            targetUrl: targetUrl,
            redirectMode: mode,
            interstitialTitle: title,
            interstitialMessage: message,
            bannerImageUrl: bannerUrl,
            activeFrom: activeFromStr,
            expiresAt: expiresAtStr,
            generateQr: true
        )
        
        do {
            let newLink = try await service.createShortlink(request)
            shortlinks.insert(newLink, at: 0)
            isLoading = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
    
    func updateShortlink(id: String, targetUrl: String, mode: ShortLink.RedirectMode) async -> Bool {
        // Implement simplified update for now
        let request = UpdateShortLinkRequest(
            targetUrl: targetUrl,
            redirectMode: mode,
            interstitialTitle: nil,
            interstitialMessage: nil,
            bannerImageUrl: nil,
            isActive: nil,
            activeFrom: nil,
            expiresAt: nil
        )
        
        do {
            let updated = try await service.updateShortlink(id: id, request: request)
            if let index = shortlinks.firstIndex(where: { $0.id == id }) {
                shortlinks[index] = updated
            }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
