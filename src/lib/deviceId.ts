const DEVICE_ID_KEY = 'photovault_device_id'
const DEVICE_NAME_KEY = 'photovault_device_name'

// Get or create a unique device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server'
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
    console.log('Generated new device ID:', deviceId)
  }

  return deviceId
}

// Get device type based on UserAgent
export function getDeviceType(): 'iphone' | 'ipad' | 'mac' | 'windows' | 'android' | 'linux' | 'unknown' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown'
  }

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('iphone')) return 'iphone'
  if (ua.includes('ipad')) return 'ipad'
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'mac'
  if (ua.includes('windows')) return 'windows'
  if (ua.includes('android')) return 'android'
  if (ua.includes('linux')) return 'linux'

  return 'unknown'
}

// Get a friendly device name
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Server'
  }

  // Check if user has set a custom name
  const customName = localStorage.getItem(DEVICE_NAME_KEY)
  if (customName) return customName

  // Generate default name based on device type
  const deviceType = getDeviceType()
  const typeNames: Record<string, string> = {
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'mac': 'Mac',
    'windows': 'Windows PC',
    'android': 'Android',
    'linux': 'Linux PC',
    'unknown': 'Browser'
  }

  return typeNames[deviceType] || 'Unknown Device'
}

// Set a custom device name
export function setDeviceName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEVICE_NAME_KEY, name)
  }
}

// Get device info summary
export function getDeviceInfo() {
  return {
    id: getDeviceId(),
    name: getDeviceName(),
    type: getDeviceType()
  }
}
