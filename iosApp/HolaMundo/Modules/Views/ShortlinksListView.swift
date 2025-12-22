import SwiftUI

struct ShortlinksListView: View {
    @StateObject private var viewModel = ShortlinksViewModel()
    @State private var showingCreateSheet = false
    
    var body: some View {
        NavigationView {
            List {
                if viewModel.isLoading && viewModel.shortlinks.isEmpty {
                    ProgressView()
                } else if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red)
                } else {
                    ForEach(viewModel.shortlinks) { link in
                        NavigationLink(destination: ShortlinkDetailView(link: link)) {
                            ShortlinkRow(link: link)
                        }
                    }
                }
            }
            .searchable(text: $viewModel.searchText)
            .navigationTitle("Acortador y QR")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingCreateSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateSheet) {
                CreateShortlinkView(viewModel: viewModel, isPresented: $showingCreateSheet)
            }
            .task {
                await viewModel.fetchShortlinks()
            }
        }
    }
}

struct ShortlinkRow: View {
    let link: ShortLink
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(link.shortCode)
                .font(.headline)
                .foregroundColor(.blue)
            Text(link.targetUrl)
                .font(.subheadline)
                .foregroundColor(.gray)
                .lineLimit(1)
            HStack {
                Label("\(link.scanCount)", systemImage: "chart.bar")
                Spacer()
                Text(link.redirectMode.displayName)
                    .font(.caption)
                    .padding(4)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(4)
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}
