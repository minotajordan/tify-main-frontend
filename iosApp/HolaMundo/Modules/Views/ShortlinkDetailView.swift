import SwiftUI
import WebKit

struct ShortlinkDetailView: View {
    let link: ShortLink
    @State private var showingHistory = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // QR Code Section
                if let qr = link.qr, qr.format == "SVG" {
                    SVGWebView(svgString: qr.qrData)
                        .frame(width: 200, height: 200)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(radius: 5)
                } else {
                    Image(systemName: "qrcode")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 150, height: 150)
                        .foregroundColor(.gray)
                }
                
                VStack(spacing: 8) {
                    Text(link.shortCode)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                    
                    Text(link.shortUrl)
                        .font(.headline)
                        .foregroundColor(.blue)
                        .onTapGesture {
                            UIPasteboard.general.string = link.shortUrl
                        }
                    Text("Toca para copiar")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                
                VStack(alignment: .leading, spacing: 12) {
                    InfoRow(icon: "arrow.turn.down.right", title: "Destino", value: link.targetUrl)
                    InfoRow(icon: "gearshape", title: "Modo", value: link.redirectMode.displayName)
                    InfoRow(icon: "eye", title: "Visitas", value: "\(link.scanCount)")
                    if let expires = link.expiresAt {
                        InfoRow(icon: "clock", title: "Expira", value: expires)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.top)
        }
        .navigationTitle("Detalle Link")
    }
}

struct InfoRow: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .frame(width: 24)
            VStack(alignment: .leading) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.body)
            }
        }
    }
}

struct SVGWebView: UIViewRepresentable {
    let svgString: String
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        let html = """
        <html>
        <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: transparent; } svg { width: 100%; height: 100%; }</style>
        </head>
        <body>
        \(svgString)
        </body>
        </html>
        """
        uiView.loadHTMLString(html, baseURL: nil)
    }
}
