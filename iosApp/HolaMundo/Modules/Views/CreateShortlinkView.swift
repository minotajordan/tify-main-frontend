import SwiftUI

struct CreateShortlinkView: View {
    @ObservedObject var viewModel: ShortlinksViewModel
    @Binding var isPresented: Bool
    
    @State private var targetUrl = ""
    @State private var redirectMode: ShortLink.RedirectMode = .immediate
    @State private var interstitialTitle = ""
    @State private var interstitialMessage = ""
    @State private var hasExpiration = false
    @State private var expiresAt = Date().addingTimeInterval(86400 * 30) // 30 days default
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Destino")) {
                    TextField("https://ejemplo.com/largo...", text: $targetUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                }
                
                Section(header: Text("Configuración")) {
                    Picker("Modo de Redirección", selection: $redirectMode) {
                        ForEach(ShortLink.RedirectMode.allCases, id: \.self) { mode in
                            Text(mode.displayName).tag(mode)
                        }
                    }
                    
                    if redirectMode == .interstitial {
                        TextField("Título Intersticial", text: $interstitialTitle)
                        TextField("Mensaje", text: $interstitialMessage)
                    }
                    
                    Toggle("Vigencia limitada", isOn: $hasExpiration)
                    if hasExpiration {
                        DatePicker("Expira", selection: $expiresAt, displayedComponents: [.date, .hourAndMinute])
                    }
                }
                
                Section(footer: Text("Se generará automáticamente un código QR para este enlace.")) {
                    Button(action: createLink) {
                        if viewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Crear Link y QR")
                                .frame(maxWidth: .infinity)
                                .foregroundColor(.white)
                        }
                    }
                    .listRowBackground(Color.blue)
                    .disabled(targetUrl.isEmpty || viewModel.isLoading)
                }
            }
            .navigationTitle("Nuevo Shortlink")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { isPresented = false }
                }
            }
        }
    }
    
    private func createLink() {
        Task {
            let success = await viewModel.createShortlink(
                targetUrl: targetUrl,
                mode: redirectMode,
                title: redirectMode == .interstitial ? interstitialTitle : nil,
                message: redirectMode == .interstitial ? interstitialMessage : nil,
                bannerUrl: nil,
                activeFrom: nil,
                expiresAt: hasExpiration ? expiresAt : nil
            )
            if success {
                isPresented = false
            }
        }
    }
}
