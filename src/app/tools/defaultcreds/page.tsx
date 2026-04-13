'use client'
import { useState, useMemo } from 'react'
import { Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface Cred { vendor: string; device: string; username: string; password: string; category: string }

const CREDS: Cred[] = [
  // ────────────────────────────────────────────────────────
  // NETWORK — Routers / Switches / APs
  // ────────────────────────────────────────────────────────
  { vendor:'Cisco',          device:'IOS Router',             username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Cisco',          device:'IOS Router',             username:'cisco',          password:'cisco',              category:'Network' },
  { vendor:'Cisco',          device:'IOS Router',             username:'admin',          password:'',                   category:'Network' },
  { vendor:'Cisco',          device:'ASA Firewall',           username:'admin',          password:'',                   category:'Network' },
  { vendor:'Cisco',          device:'Catalyst Switch',        username:'admin',          password:'cisco',              category:'Network' },
  { vendor:'Cisco',          device:'Meraki MX',              username:'admin',          password:'',                   category:'Network' },
  { vendor:'Cisco',          device:'Small Business Router',  username:'cisco',          password:'cisco',              category:'Network' },
  { vendor:'Cisco',          device:'RV Series',              username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Cisco',          device:'Aironet AP',             username:'Cisco',          password:'Cisco',              category:'Network' },
  { vendor:'Juniper',        device:'Junos',                  username:'root',           password:'',                   category:'Network' },
  { vendor:'Juniper',        device:'SRX Firewall',           username:'root',           password:'',                   category:'Network' },
  { vendor:'Juniper',        device:'EX Switch',              username:'root',           password:'',                   category:'Network' },
  { vendor:'Aruba',          device:'Controller',             username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Aruba',          device:'IAP (Instant AP)',       username:'admin',          password:'admin',              category:'Network' },
  { vendor:'HP ProCurve',    device:'Switch',                 username:'admin',          password:'',                   category:'Network' },
  { vendor:'HP ProCurve',    device:'Switch (old)',           username:'manager',        password:'manager',            category:'Network' },
  { vendor:'Extreme',        device:'ExtremeOS Switch',       username:'admin',          password:'',                   category:'Network' },
  { vendor:'Brocade',        device:'FastIron Switch',        username:'admin',          password:'password',           category:'Network' },
  { vendor:'Ruckus',         device:'ZoneDirector',           username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Ruckus',         device:'SmartZone',              username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Alcatel-Lucent', device:'OmniSwitch',             username:'admin',          password:'switch',             category:'Network' },
  { vendor:'Netgear',        device:'Router',                 username:'admin',          password:'password',           category:'Network' },
  { vendor:'Netgear',        device:'Router',                 username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Netgear',        device:'Nighthawk',              username:'admin',          password:'password',           category:'Network' },
  { vendor:'Netgear',        device:'ProSAFE Switch',         username:'admin',          password:'password',           category:'Network' },
  { vendor:'Linksys',        device:'Router',                 username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Linksys',        device:'WRT Series',             username:'admin',          password:'admin',              category:'Network' },
  { vendor:'D-Link',         device:'Router',                 username:'admin',          password:'',                   category:'Network' },
  { vendor:'D-Link',         device:'DIR Series',             username:'Admin',          password:'',                   category:'Network' },
  { vendor:'D-Link',         device:'DSL Modem',              username:'admin',          password:'admin',              category:'Network' },
  { vendor:'TP-Link',        device:'Router',                 username:'admin',          password:'admin',              category:'Network' },
  { vendor:'TP-Link',        device:'Archer Series',          username:'admin',          password:'admin',              category:'Network' },
  { vendor:'TP-Link',        device:'TL-WR Series',           username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Zyxel',          device:'Router/AP',              username:'admin',          password:'1234',               category:'Network' },
  { vendor:'Zyxel',          device:'USG Firewall',           username:'admin',          password:'zipped',             category:'Network' },
  { vendor:'Zyxel',          device:'DSL Modem',              username:'admin',          password:'1234',               category:'Network' },
  { vendor:'Ubiquiti',       device:'UniFi AP',               username:'ubnt',           password:'ubnt',               category:'Network' },
  { vendor:'Ubiquiti',       device:'EdgeRouter',             username:'ubnt',           password:'ubnt',               category:'Network' },
  { vendor:'Ubiquiti',       device:'UniFi Controller',       username:'admin',          password:'ubnt',               category:'Network' },
  { vendor:'Huawei',         device:'Router',                 username:'admin',          password:'Admin@huawei',        category:'Network' },
  { vendor:'Huawei',         device:'HG Series',              username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Huawei',         device:'ONT/ONU',                username:'admin',          password:'admin',              category:'Network' },
  { vendor:'ZTE',            device:'Router',                 username:'admin',          password:'admin',              category:'Network' },
  { vendor:'ZTE',            device:'F Series ONT',           username:'admin',          password:'admin',              category:'Network' },
  { vendor:'ZTE',            device:'ZXDSL',                  username:'admin',          password:'admin',              category:'Network' },
  { vendor:'ASUS',           device:'Router',                 username:'admin',          password:'admin',              category:'Network' },
  { vendor:'ASUS',           device:'RT-AC / RT-AX Series',  username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Belkin',         device:'Router',                 username:'admin',          password:'',                   category:'Network' },
  { vendor:'Belkin',         device:'F9K Series',             username:'',               password:'',                   category:'Network' },
  { vendor:'Buffalo',        device:'AirStation',             username:'admin',          password:'password',           category:'Network' },
  { vendor:'Arris',          device:'Cable Modem/Router',     username:'admin',          password:'password',           category:'Network' },
  { vendor:'Arris',          device:'SB Series',              username:'admin',          password:'password',           category:'Network' },
  { vendor:'Motorola',       device:'Cable Modem',            username:'admin',          password:'motorola',           category:'Network' },
  { vendor:'Sagemcom',       device:'DSL Router',             username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Technicolor',    device:'Gateway',                username:'admin',          password:'admin',              category:'Network' },
  { vendor:'DrayTek',        device:'Vigor Router',           username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Cradlepoint',    device:'LTE Router',             username:'admin',          password:'',                   category:'Network' },
  { vendor:'Peplink',        device:'Balance Router',         username:'admin',          password:'admin',              category:'Network' },
  { vendor:'EnGenius',       device:'AP / Router',            username:'admin',          password:'admin',              category:'Network' },
  { vendor:'Mikrotik',       device:'RouterOS',               username:'admin',          password:'',                   category:'Network' },
  { vendor:'Mikrotik',       device:'hEX / hAP',             username:'admin',          password:'',                   category:'Network' },
  { vendor:'Allied Telesis', device:'Switch',                 username:'manager',        password:'friend',             category:'Network' },

  // ────────────────────────────────────────────────────────
  // FIREWALL / SECURITY APPLIANCES
  // ────────────────────────────────────────────────────────
  { vendor:'Fortinet',       device:'FortiGate',              username:'admin',          password:'',                   category:'Firewall' },
  { vendor:'Palo Alto',      device:'PAN-OS',                 username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'SonicWall',      device:'SonicOS',                username:'admin',          password:'password',           category:'Firewall' },
  { vendor:'Check Point',    device:'Gaia',                   username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'pfSense',        device:'Firewall',               username:'admin',          password:'pfsense',            category:'Firewall' },
  { vendor:'OPNsense',       device:'Firewall',               username:'root',           password:'opnsense',           category:'Firewall' },
  { vendor:'Barracuda',      device:'NextGen Firewall',       username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'WatchGuard',     device:'Firebox',                username:'admin',          password:'readwrite',          category:'Firewall' },
  { vendor:'Sophos',         device:'XG Firewall',            username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'Cisco',          device:'Firepower FTD',          username:'admin',          password:'Admin123',           category:'Firewall' },
  { vendor:'Untangle',       device:'NG Firewall',            username:'admin',          password:'passwd',             category:'Firewall' },
  { vendor:'IPFire',         device:'Firewall',               username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'Smoothwall',     device:'Express',                username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'Endian',         device:'UTM',                    username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'Cyberoam',       device:'UTM',                    username:'admin',          password:'admin',              category:'Firewall' },
  { vendor:'Stormshield',    device:'Network Security',       username:'admin',          password:'admin',              category:'Firewall' },

  // ────────────────────────────────────────────────────────
  // IP CAMERAS / NVR / DVR
  // ────────────────────────────────────────────────────────
  { vendor:'Hikvision',      device:'IP Camera',              username:'admin',          password:'12345',              category:'Camera' },
  { vendor:'Hikvision',      device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Hikvision',      device:'NVR/DVR',                username:'admin',          password:'12345',              category:'Camera' },
  { vendor:'Hikvision',      device:'DS-2CD Series',          username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Dahua',          device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Dahua',          device:'NVR/DVR',                username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Dahua',          device:'IPC-HDW Series',         username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Axis',           device:'IP Camera',              username:'root',           password:'pass',               category:'Camera' },
  { vendor:'Axis',           device:'IP Camera',              username:'root',           password:'root',               category:'Camera' },
  { vendor:'Bosch',          device:'IP Camera',              username:'admin',          password:'',                   category:'Camera' },
  { vendor:'Samsung',        device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Hanwha',         device:'Wisenet Camera',         username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Vivotek',        device:'IP Camera',              username:'root',           password:'',                   category:'Camera' },
  { vendor:'Reolink',        device:'IP Camera',              username:'admin',          password:'',                   category:'Camera' },
  { vendor:'Reolink',        device:'NVR',                    username:'admin',          password:'',                   category:'Camera' },
  { vendor:'Amcrest',        device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Foscam',         device:'IP Camera',              username:'admin',          password:'',                   category:'Camera' },
  { vendor:'Foscam',         device:'FI Series',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Lorex',          device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Panasonic',      device:'IP Camera',              username:'admin',          password:'12345',              category:'Camera' },
  { vendor:'Sony',           device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Pelco',          device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Avigilon',       device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Mobotix',        device:'IP Camera',              username:'admin',          password:'meinsm',             category:'Camera' },
  { vendor:'ACTi',           device:'IP Camera',              username:'admin',          password:'123456',             category:'Camera' },
  { vendor:'GeoVision',      device:'IP Camera',              username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'March Networks', device:'DVR',                    username:'admin',          password:'admin',              category:'Camera' },
  { vendor:'Swann',          device:'DVR/NVR',                username:'admin',          password:'12345',              category:'Camera' },
  { vendor:'Annke',          device:'IP Camera',              username:'admin',          password:'',                   category:'Camera' },
  { vendor:'Uniview',        device:'IP Camera',              username:'admin',          password:'123456',             category:'Camera' },
  { vendor:'TVT',            device:'DVR',                    username:'admin',          password:'1111',               category:'Camera' },
  { vendor:'Tiandy',         device:'IP Camera',              username:'admin',          password:'111111',             category:'Camera' },

  // ────────────────────────────────────────────────────────
  // SMART TVs
  // ────────────────────────────────────────────────────────
  { vendor:'Samsung',        device:'Smart TV (Tizen)',       username:'admin',          password:'samsung',            category:'Smart TV' },
  { vendor:'Samsung',        device:'Smart TV Web Interface', username:'admin',          password:'',                   category:'Smart TV' },
  { vendor:'LG',             device:'webOS TV',               username:'admin',          password:'',                   category:'Smart TV' },
  { vendor:'LG',             device:'OLED / NanoCell TV',    username:'admin',          password:'lg',                 category:'Smart TV' },
  { vendor:'Sony',           device:'Bravia Android TV',      username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'Sony',           device:'Bravia (older)',         username:'admin',          password:'1234',               category:'Smart TV' },
  { vendor:'Philips',        device:'Android TV',             username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'Hisense',        device:'Smart TV',               username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'TCL',            device:'Roku TV',                username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'Vizio',          device:'SmartCast TV',           username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'Toshiba',        device:'Smart TV',               username:'admin',          password:'admin',              category:'Smart TV' },
  { vendor:'Sharp',          device:'Aquos Smart TV',         username:'admin',          password:'admin',              category:'Smart TV' },

  // ────────────────────────────────────────────────────────
  // NAS / STORAGE
  // ────────────────────────────────────────────────────────
  { vendor:'Synology',       device:'DiskStation',            username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'Synology',       device:'DiskStation (new)',      username:'admin',          password:'',                   category:'NAS/Storage' },
  { vendor:'QNAP',           device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'QNAP',           device:'TS Series',              username:'admin',          password:'',                   category:'NAS/Storage' },
  { vendor:'Western Digital',device:'My Cloud',               username:'admin',          password:'',                   category:'NAS/Storage' },
  { vendor:'Western Digital',device:'My Cloud Home',          username:'admin',          password:'password',           category:'NAS/Storage' },
  { vendor:'Seagate',        device:'Personal Cloud NAS',     username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'Netgear',        device:'ReadyNAS',               username:'admin',          password:'netgear1',           category:'NAS/Storage' },
  { vendor:'Buffalo',        device:'TeraStation',            username:'admin',          password:'password',           category:'NAS/Storage' },
  { vendor:'Drobo',          device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'TrueNAS',        device:'Core/SCALE',             username:'root',           password:'',                   category:'NAS/Storage' },
  { vendor:'Terramaster',    device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'Asustor',        device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'Iomega',         device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'LaCie',          device:'NAS',                    username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'EMC',            device:'Isilon (OneFS)',         username:'admin',          password:'admin',              category:'NAS/Storage' },
  { vendor:'NetApp',         device:'ONTAP',                  username:'admin',          password:'netapp1!',           category:'NAS/Storage' },

  // ────────────────────────────────────────────────────────
  // IoT / SMART HOME
  // ────────────────────────────────────────────────────────
  { vendor:'Philips Hue',    device:'Bridge',                 username:'',               password:'',                   category:'IoT/Smart Home' },
  { vendor:'TP-Link',        device:'Kasa Smart Plug',        username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Shelly',         device:'IoT Relay/Dimmer',       username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Sonoff',         device:'Smart Switch',           username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Wyze',           device:'Camera',                 username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Ring',           device:'Doorbell/Camera',        username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Arlo',           device:'Camera Hub',             username:'admin',          password:'password',           category:'IoT/Smart Home' },
  { vendor:'Wemo',           device:'Smart Plug (Belkin)',    username:'admin',          password:'',                   category:'IoT/Smart Home' },
  { vendor:'Insteon',        device:'Hub',                    username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Vera',           device:'SmartHome Controller',   username:'admin',          password:'',                   category:'IoT/Smart Home' },
  { vendor:'HomeSeer',       device:'HS3/HS4',                username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Hubitat',        device:'Elevation Hub',          username:'admin',          password:'',                   category:'IoT/Smart Home' },
  { vendor:'Home Assistant', device:'OS (default install)',   username:'admin',          password:'',                   category:'IoT/Smart Home' },
  { vendor:'Tuya',           device:'Smart Device',           username:'admin',          password:'12345678',           category:'IoT/Smart Home' },
  { vendor:'Xiaomi',         device:'Mi Router',              username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Xiaomi',         device:'Mi Hub (Zigbee)',        username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Ezviz',          device:'IP Camera',              username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Blink',          device:'Camera Sync Module',     username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Eufy',           device:'Homebase',               username:'admin',          password:'admin',              category:'IoT/Smart Home' },
  { vendor:'Zmodo',          device:'Camera/NVR',             username:'admin',          password:'111111',             category:'IoT/Smart Home' },

  // ────────────────────────────────────────────────────────
  // VoIP / PBX
  // ────────────────────────────────────────────────────────
  { vendor:'Cisco',          device:'IP Phone (7900 Series)', username:'admin',          password:'cisco',              category:'VoIP/PBX' },
  { vendor:'Cisco',          device:'Unified CM (CallManager)',username:'admin',         password:'admin',              category:'VoIP/PBX' },
  { vendor:'Polycom',        device:'VoIP Phone',             username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Polycom',        device:'SoundStation',           username:'admin',          password:'456',                category:'VoIP/PBX' },
  { vendor:'Yealink',        device:'IP Phone',               username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Grandstream',    device:'IP Phone',               username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Grandstream',    device:'UCM PBX',                username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Snom',           device:'IP Phone',               username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Fanvil',         device:'IP Phone',               username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Avaya',          device:'IP Office',              username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Avaya',          device:'Aura System Manager',    username:'admin',          password:'admin01',            category:'VoIP/PBX' },
  { vendor:'Mitel',          device:'MiVoice',                username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'FreePBX',        device:'Asterisk PBX',           username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'3CX',            device:'Phone System',           username:'admin',          password:'admin',              category:'VoIP/PBX' },
  { vendor:'Elastix',        device:'PBX',                    username:'admin',          password:'palosanto',          category:'VoIP/PBX' },
  { vendor:'VitalPBX',       device:'PBX',                    username:'admin',          password:'admin',              category:'VoIP/PBX' },

  // ────────────────────────────────────────────────────────
  // UPS / POWER MANAGEMENT
  // ────────────────────────────────────────────────────────
  { vendor:'APC',            device:'Smart-UPS NMC',          username:'apc',            password:'apc',                category:'UPS/Power' },
  { vendor:'APC',            device:'Smart-UPS NMC',          username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'APC',            device:'PDU (AP8XXX)',           username:'apc',            password:'apc',                category:'UPS/Power' },
  { vendor:'Eaton',          device:'UPS (Web)',              username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'Eaton',          device:'ePDU',                   username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'CyberPower',     device:'UPS',                    username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'Vertiv',         device:'Liebert GXT4',           username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'Tripp Lite',     device:'UPS',                    username:'admin',          password:'admin',              category:'UPS/Power' },
  { vendor:'Raritan',        device:'PDU',                    username:'admin',          password:'raritan',            category:'UPS/Power' },
  { vendor:'ServerTech',     device:'PDU',                    username:'admn',           password:'admn',               category:'UPS/Power' },

  // ────────────────────────────────────────────────────────
  // DATABASES
  // ────────────────────────────────────────────────────────
  { vendor:'MySQL',          device:'Database',               username:'root',           password:'',                   category:'Database' },
  { vendor:'MySQL',          device:'Database',               username:'root',           password:'root',               category:'Database' },
  { vendor:'MySQL',          device:'Database',               username:'root',           password:'toor',               category:'Database' },
  { vendor:'MariaDB',        device:'Database',               username:'root',           password:'',                   category:'Database' },
  { vendor:'MariaDB',        device:'Database',               username:'root',           password:'mariadb',            category:'Database' },
  { vendor:'PostgreSQL',     device:'Database',               username:'postgres',       password:'postgres',           category:'Database' },
  { vendor:'PostgreSQL',     device:'Database',               username:'postgres',       password:'',                   category:'Database' },
  { vendor:'MSSQL',          device:'SQL Server',             username:'sa',             password:'sa',                 category:'Database' },
  { vendor:'MSSQL',          device:'SQL Server',             username:'sa',             password:'',                   category:'Database' },
  { vendor:'MSSQL',          device:'SQL Server',             username:'sa',             password:'Password1',          category:'Database' },
  { vendor:'Oracle',         device:'Database',               username:'sys',            password:'change_on_install',  category:'Database' },
  { vendor:'Oracle',         device:'Database',               username:'system',         password:'manager',            category:'Database' },
  { vendor:'Oracle',         device:'Database',               username:'scott',          password:'tiger',              category:'Database' },
  { vendor:'MongoDB',        device:'Database',               username:'',               password:'',                   category:'Database' },
  { vendor:'MongoDB',        device:'Admin',                  username:'admin',          password:'admin',              category:'Database' },
  { vendor:'Redis',          device:'Cache Server',           username:'',               password:'',                   category:'Database' },
  { vendor:'Elasticsearch',  device:'Search',                 username:'elastic',        password:'changeme',           category:'Database' },
  { vendor:'CouchDB',        device:'Database',               username:'admin',          password:'admin',              category:'Database' },
  { vendor:'Cassandra',      device:'Database',               username:'cassandra',      password:'cassandra',          category:'Database' },
  { vendor:'InfluxDB',       device:'Time-Series DB',         username:'admin',          password:'admin',              category:'Database' },
  { vendor:'Neo4j',          device:'Graph Database',         username:'neo4j',          password:'neo4j',              category:'Database' },
  { vendor:'IBM DB2',        device:'Database',               username:'db2admin',       password:'db2admin',           category:'Database' },
  { vendor:'Couchbase',      device:'Database',               username:'Administrator',  password:'password',           category:'Database' },
  { vendor:'RabbitMQ',       device:'Message Broker',         username:'guest',          password:'guest',              category:'Database' },
  { vendor:'Apache Kafka',   device:'Broker',                 username:'admin',          password:'admin',              category:'Database' },
  { vendor:'phpMyAdmin',     device:'Web UI',                 username:'root',           password:'',                   category:'Database' },

  // ────────────────────────────────────────────────────────
  // APP SERVERS / MIDDLEWARE
  // ────────────────────────────────────────────────────────
  { vendor:'Apache Tomcat',  device:'App Server',             username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Apache Tomcat',  device:'App Server',             username:'tomcat',         password:'tomcat',             category:'Server' },
  { vendor:'Apache Tomcat',  device:'App Server (old)',       username:'both',           password:'tomcat',             category:'Server' },
  { vendor:'JBoss/WildFly',  device:'App Server',             username:'admin',          password:'admin',              category:'Server' },
  { vendor:'WebLogic',       device:'App Server',             username:'weblogic',       password:'weblogic1',          category:'Server' },
  { vendor:'WebSphere',      device:'App Server',             username:'admin',          password:'admin',              category:'Server' },
  { vendor:'GlassFish',      device:'App Server',             username:'admin',          password:'adminadmin',         category:'Server' },
  { vendor:'Jenkins',        device:'CI/CD',                  username:'admin',          password:'admin',              category:'Server' },
  { vendor:'GitLab',         device:'CE/EE',                  username:'root',           password:'5iveL!fe',           category:'Server' },
  { vendor:'Nexus',          device:'Repository Manager',     username:'admin',          password:'admin123',           category:'Server' },
  { vendor:'Harbor',         device:'Container Registry',     username:'admin',          password:'Harbor12345',        category:'Server' },
  { vendor:'SonarQube',      device:'Code Quality',           username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Portainer',      device:'Docker UI',              username:'admin',          password:'portainer',          category:'Server' },
  { vendor:'Rancher',        device:'Kubernetes UI',          username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Grafana',        device:'Dashboard',              username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Kibana',         device:'Dashboard',              username:'elastic',        password:'changeme',           category:'Server' },
  { vendor:'Keycloak',       device:'IAM',                    username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Rundeck',        device:'Job Scheduler',          username:'admin',          password:'admin',              category:'Server' },
  { vendor:'Graylog',        device:'Log Management',         username:'admin',          password:'admin',              category:'Server' },
  { vendor:'OpenNMS',        device:'Network Monitoring',     username:'admin',          password:'admin',              category:'Server' },

  // ────────────────────────────────────────────────────────
  // SERVER MANAGEMENT / VIRTUALIZATION
  // ────────────────────────────────────────────────────────
  { vendor:'Dell',           device:'iDRAC',                  username:'root',           password:'calvin',             category:'Management' },
  { vendor:'Dell',           device:'iDRAC 9',                username:'root',           password:'calvin',             category:'Management' },
  { vendor:'HP',             device:'iLO 4/5',                username:'Administrator',  password:'admin',              category:'Management' },
  { vendor:'Supermicro',     device:'IPMI/BMC',               username:'ADMIN',          password:'ADMIN',              category:'Management' },
  { vendor:'Lenovo',         device:'IMM/XCC',                username:'USERID',         password:'PASSW0RD',           category:'Management' },
  { vendor:'IBM',            device:'AMM (BladeCenter)',      username:'USERID',         password:'PASSW0RD',           category:'Management' },
  { vendor:'Fujitsu',        device:'iRMC',                   username:'admin',          password:'admin',              category:'Management' },
  { vendor:'VMware',         device:'ESXi',                   username:'root',           password:'vmware',             category:'Management' },
  { vendor:'VMware',         device:'vCenter',                username:'administrator',  password:'vmware',             category:'Management' },
  { vendor:'VMware',         device:'vCenter',                username:'administrator',  password:'Admin!23',           category:'Management' },
  { vendor:'Proxmox',        device:'VE',                     username:'root',           password:'proxmox',            category:'Management' },
  { vendor:'Nutanix',        device:'AOS/Prism',              username:'admin',          password:'admin',              category:'Management' },
  { vendor:'Citrix',         device:'XenServer',              username:'root',           password:'xenroot',            category:'Management' },
  { vendor:'Microsoft',      device:'Hyper-V Server',         username:'Administrator',  password:'admin',              category:'Management' },
  { vendor:'oVirt',          device:'Engine',                 username:'admin',          password:'ovirt',              category:'Management' },
  { vendor:'OpenStack',      device:'Dashboard (Horizon)',     username:'admin',          password:'admin',              category:'Management' },

  // ────────────────────────────────────────────────────────
  // PRINTERS / MFP
  // ────────────────────────────────────────────────────────
  { vendor:'HP',             device:'Printer / JetDirect',   username:'admin',          password:'admin',              category:'Printer' },
  { vendor:'HP',             device:'LaserJet MFP',           username:'admin',          password:'',                   category:'Printer' },
  { vendor:'Xerox',          device:'Printer',                username:'admin',          password:'1111',               category:'Printer' },
  { vendor:'Xerox',          device:'WorkCentre',             username:'admin',          password:'admin',              category:'Printer' },
  { vendor:'Canon',          device:'Printer',                username:'ADMIN',          password:'canon',              category:'Printer' },
  { vendor:'Canon',          device:'imageRUNNER',            username:'admin',          password:'access',             category:'Printer' },
  { vendor:'Ricoh',          device:'Printer',                username:'admin',          password:'admin',              category:'Printer' },
  { vendor:'Konica Minolta', device:'Bizhub',                 username:'admin',          password:'',                   category:'Printer' },
  { vendor:'Kyocera',        device:'ECOSYS',                 username:'Admin',          password:'Admin',              category:'Printer' },
  { vendor:'Brother',        device:'MFC Series',             username:'admin',          password:'access',             category:'Printer' },
  { vendor:'Lexmark',        device:'Printer',                username:'admin',          password:'admin',              category:'Printer' },
  { vendor:'Samsung',        device:'Printer',                username:'admin',          password:'sec00000',           category:'Printer' },
  { vendor:'Epson',          device:'Network Printer',        username:'admin',          password:'',                   category:'Printer' },
  { vendor:'OKI',            device:'Printer',                username:'admin',          password:'aaaaaa',             category:'Printer' },
  { vendor:'Sharp',          device:'MFP',                    username:'admin',          password:'admin',              category:'Printer' },

  // ────────────────────────────────────────────────────────
  // MONITORING / OBSERVABILITY
  // ────────────────────────────────────────────────────────
  { vendor:'Nagios',         device:'Monitoring',             username:'nagiosadmin',    password:'nagiosadmin',        category:'Monitoring' },
  { vendor:'Zabbix',         device:'Monitoring',             username:'Admin',          password:'zabbix',             category:'Monitoring' },
  { vendor:'Grafana',        device:'Dashboard',              username:'admin',          password:'admin',              category:'Monitoring' },
  { vendor:'PRTG',           device:'Monitoring',             username:'prtgadmin',      password:'prtgadmin',          category:'Monitoring' },
  { vendor:'LibreNMS',       device:'Monitoring',             username:'admin',          password:'admin',              category:'Monitoring' },
  { vendor:'Icinga',         device:'Monitoring',             username:'icingaadmin',    password:'icingaadmin',        category:'Monitoring' },
  { vendor:'Checkmk',        device:'Monitoring',             username:'admin',          password:'admin',              category:'Monitoring' },
  { vendor:'Observium',      device:'Monitoring',             username:'admin',          password:'admin',              category:'Monitoring' },
  { vendor:'Netdata',        device:'Metrics',                username:'admin',          password:'',                   category:'Monitoring' },
  { vendor:'Prometheus',     device:'Metrics',                username:'',               password:'',                   category:'Monitoring' },
  { vendor:'Opsgenie',       device:'Alerting',               username:'admin',          password:'admin',              category:'Monitoring' },

  // ────────────────────────────────────────────────────────
  // WEB APPLICATIONS / CMS
  // ────────────────────────────────────────────────────────
  { vendor:'WordPress',      device:'CMS',                    username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'WordPress',      device:'CMS',                    username:'admin',          password:'password',           category:'Web App' },
  { vendor:'Joomla',         device:'CMS',                    username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'Drupal',         device:'CMS',                    username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'Magento',        device:'E-Commerce',             username:'admin',          password:'admin123',           category:'Web App' },
  { vendor:'OpenCart',       device:'E-Commerce',             username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'PrestaShop',     device:'E-Commerce',             username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'cPanel',         device:'Hosting Panel',          username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'Plesk',          device:'Hosting Panel',          username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'WHM',            device:'Web Host Manager',       username:'root',           password:'',                   category:'Web App' },
  { vendor:'DirectAdmin',    device:'Hosting Panel',          username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'Webmin',         device:'Admin Panel',            username:'admin',          password:'admin',              category:'Web App' },
  { vendor:'phpMyAdmin',     device:'DB Web UI',              username:'root',           password:'',                   category:'Web App' },

  // ────────────────────────────────────────────────────────
  // VPN / REMOTE ACCESS
  // ────────────────────────────────────────────────────────
  { vendor:'Pulse Secure',   device:'SSL VPN',                username:'admin',          password:'pulse',              category:'VPN' },
  { vendor:'Citrix',         device:'NetScaler/ADC',          username:'nsroot',         password:'nsroot',             category:'VPN' },
  { vendor:'F5',             device:'BIG-IP',                 username:'admin',          password:'admin',              category:'VPN' },
  { vendor:'F5',             device:'BIG-IP',                 username:'root',           password:'default',            category:'VPN' },
  { vendor:'Cisco',          device:'AnyConnect ASA',         username:'admin',          password:'admin',              category:'VPN' },
  { vendor:'OpenVPN',        device:'Access Server',          username:'admin',          password:'',                   category:'VPN' },
  { vendor:'SoftEther',      device:'VPN Server',             username:'admin',          password:'admin',              category:'VPN' },
  { vendor:'Fortinet',       device:'FortiGate SSL VPN',      username:'admin',          password:'',                   category:'VPN' },
  { vendor:'GlobalProtect',  device:'Palo Alto VPN',          username:'admin',          password:'admin',              category:'VPN' },

  // ────────────────────────────────────────────────────────
  // ICS / SCADA / INDUSTRIAL
  // ────────────────────────────────────────────────────────
  { vendor:'Siemens',        device:'SIMATIC HMI',            username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Siemens',        device:'WinCC',                  username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Siemens',        device:'S7 PLC Web',             username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Schneider',      device:'Modicon',                username:'USER',           password:'USER',               category:'ICS/SCADA' },
  { vendor:'Schneider',      device:'EcoStruxure',            username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'GE',             device:'CIMPLICITY',             username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'GE',             device:'iFIX / Proficy',         username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Rockwell',       device:'Allen-Bradley PLC',      username:'1',              password:'1',                  category:'ICS/SCADA' },
  { vendor:'Rockwell',       device:'FactoryTalk View',       username:'administrator',  password:'',                   category:'ICS/SCADA' },
  { vendor:'ABB',            device:'AC500 PLC',              username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'ABB',            device:'Harmony SCADA',          username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Emerson',        device:'DeltaV',                 username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Honeywell',      device:'Experion PKS',           username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Mitsubishi',     device:'MELSEC Web',             username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Yokogawa',       device:'CENTUM VP',              username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Omron',          device:'NJ/NX PLC',              username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Phoenix Contact', device:'Controller',            username:'admin',          password:'admin',              category:'ICS/SCADA' },
  { vendor:'Moxa',           device:'Industrial Switch',      username:'admin',          password:'moxa',               category:'ICS/SCADA' },
  { vendor:'Red Lion',       device:'HMI',                    username:'admin',          password:'admin',              category:'ICS/SCADA' },

  // ────────────────────────────────────────────────────────
  // BUILDING AUTOMATION / BMS
  // ────────────────────────────────────────────────────────
  { vendor:'Johnson Controls',device:'Metasys',               username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Trane',          device:'Tracer SC+',             username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Carrier',        device:'Automated Logic WebCTRL', username:'admin',         password:'admin',              category:'Building/BMS' },
  { vendor:'Distech Controls',device:'ECY Series',            username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Delta Controls', device:'ORCAview',               username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Siemens',        device:'Desigo CC',              username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Honeywell',      device:'EBI / WBIO',             username:'admin',          password:'admin',              category:'Building/BMS' },
  { vendor:'Schneider',      device:'EcoStruxure BMS',        username:'admin',          password:'admin',              category:'Building/BMS' },

  // ────────────────────────────────────────────────────────
  // RETAIL POS / KIOSK
  // ────────────────────────────────────────────────────────
  { vendor:'Verifone',       device:'MX Series POS',          username:'admin',          password:'alpha',              category:'POS/Retail' },
  { vendor:'Ingenico',       device:'iPP / iSC',              username:'admin',          password:'admin',              category:'POS/Retail' },
  { vendor:'NCR',            device:'POS Terminal',           username:'admin',          password:'admin',              category:'POS/Retail' },
  { vendor:'Epson',          device:'Receipt Printer TM',     username:'admin',          password:'',                   category:'POS/Retail' },
  { vendor:'PAX',            device:'POS Terminal',           username:'admin',          password:'admin',              category:'POS/Retail' },
]

const CATEGORIES = ['All', ...Array.from(new Set(CREDS.map(c => c.category))).sort()]

export default function DefaultCredsPage() {
  const [search, setSearch]   = useState('')
  const [category, setCat]    = useState('All')
  const [copied, setCopied]   = useState('')

  const filtered = useMemo(() => CREDS.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.vendor.toLowerCase().includes(q) || c.device.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
    const matchCat = category === 'All' || c.category === category
    return matchQ && matchCat
  }), [search, category])

  function copy(val: string) {
    navigator.clipboard.writeText(val)
    setCopied(val); setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-mono text-lg font-bold text-cyber-text-hi tracking-wide">Default Credentials DB</h1>
        <p className="font-mono text-xs text-cyber-muted mt-1">Search default usernames and passwords by vendor or device — {CREDS.length} entries, offline</p>
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search vendor, device, username..."
          className="flex-1 bg-cyber-bg border border-cyber-border rounded px-3 py-2 font-mono text-xs text-cyber-text-hi placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan/60"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={clsx('px-2.5 py-1 font-mono text-[10px] rounded border transition-all', category === c
              ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30'
              : 'text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-text/20')}>
            {c}
          </button>
        ))}
      </div>

      <div className="bg-cyber-surface border border-cyber-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-cyber-border">
          <p className="font-mono text-[10px] text-cyber-muted tracking-widest uppercase">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-border">
                {['Vendor','Device','Username','Password','Category'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[9px] text-cyber-muted tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border">
              {filtered.map((c, i) => (
                <tr key={i} className="hover:bg-cyber-cyan/5 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs text-cyber-text-hi">{c.vendor}</td>
                  <td className="px-4 py-2 font-mono text-xs text-cyber-text">{c.device}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => copy(c.username)}
                      className="flex items-center gap-1.5 font-mono text-xs text-cyber-cyan hover:text-cyber-text group">
                      {c.username || <span className="italic text-cyber-muted">(empty)</span>}
                      {copied === c.username && c.username ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => copy(c.password)}
                      className="flex items-center gap-1.5 font-mono text-xs text-cyber-text hover:text-cyber-cyan group">
                      {c.password || <span className="italic text-cyber-muted">(empty)</span>}
                      {copied === c.password && c.password ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] text-cyber-muted">{c.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="font-mono text-xs text-cyber-muted text-center py-8">No matches found</p>
          )}
        </div>
      </div>
    </div>
  )
}
