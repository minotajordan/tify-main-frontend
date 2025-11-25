//
//  ChannelCard.swift
//  HolaMundo
//
//  Created by MINOTA Jordan on 25/11/25.
//

import SwiftUI

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
