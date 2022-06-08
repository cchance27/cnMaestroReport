
export class apiCoordinates {
    coordinates: number[]
}

export class apiTower {
    id: string
    location: apiCoordinates
    managed_account: string
    name: string
    network: string
}
export class apiRadio {
    auth_type: string
    channel_width: string
    color_code: string
    dfs_status: string
    dl_frame_utilization: number
    dl_kbits: number
    dl_pkts: number
    dl_pkts_loss: number
    dl_mcs: number
    dl_modulation: string
    dl_retransmits_pct: number
    dl_rssi: number
    dl_rssi_imbalance: number
    dl_lqi: number
    dl_snr: number
    dl_snr_v: number
    dl_snr_h: number
    dl_throughput: number
    frame_period: number
    frequency: number
    session_dropped: number
    sync_source: string
    sync_state: string
    tdd_ratio: string
    tx_power: number
    ul_frame_utilization: number
    ul_kbits: number
    ul_mcs: number
    ul_modulation: string
    ul_pkts: number
    ul_retransmits_pct: number
    ul_rssi: number
    ul_lqi: number
    ul_snr: number
    ul_snr_v: number
    ul_snr_h: number
    ul_pkts_loss: number
    ul_throughput: number
    software_key_throughput: string
}

export class apiPerformance {
    mac: string
    managed_account: string
    mode: string
    name: string
    network: string
    online_duration: number
    site: string
    sm_count: number
    sm_drops: number
    timestamp: string
    tower: string
    type: string
    uptime: number
    radio: apiRadio
}

export class apiStatistics {
    config_version: string
    connected_sms: number
    default_gateway: string
    gain: number
    ip: string
    ip_dns: string
    ip_dns_secondary: string
    lan_status: string
    last_sync: string
    mac: string
    managed_account: string
    mode: string
    name: string
    netmask: string
    network: string
    radio: apiRadio
    status: string
    status_time: number
    temperature: number
    tower: string
    type: string
    vlan: number
    cpu: number // new in v2
}

export class apiSmStatistics {
    network: string
    status: string
    type: string
    last_sync: string
    lan_status: string
    tower: string
    netmask: string
    ap_mac: string
    config_version: string
    distance: number
    gain: number
    mac: string
    max: string // unused v2?
    mode: string
    temperature: number
    vlan: number
    default_gateway: string
    ip_dns: string
    ip_dns_secondary: string
    managed_account: string
    status_time: number
    ip: string
    name: string
    radio: apiRadio
    cpu: number // new in v2
}