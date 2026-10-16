import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any
}

if (typeof global.Request === 'undefined') {
  class MockRequest {
    url: string
    method: string
    body: any
    headers: Map<string, string>
    constructor(input: any, init?: any) {
      this.url = typeof input === 'string' ? input : input?.url || 'http://localhost'
      this.method = init?.method || 'GET'
      this.body = init?.body
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
  global.Request = MockRequest as any
}

if (typeof global.Response === 'undefined') {
  class MockResponse {
    body: any
    status: number
    headers: Map<string, string>
    constructor(body?: any, init?: any) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    static json(data: any, init?: any) {
      return new MockResponse(data, init)
    }
  }
  global.Response = MockResponse as any
}

if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (x: number, y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: () => {},
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as any
  }

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/png;base64,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'
  }
}
