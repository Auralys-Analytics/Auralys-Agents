export class SigningEngine {
  private keyPair!: CryptoKeyPair

  private constructor(keyPair: CryptoKeyPair) {
    this.keyPair = keyPair
  }

  static async create(): Promise<SigningEngine> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    ) as CryptoKeyPair

    return new SigningEngine(keyPair)
  }

  async sign(data: string): Promise<string> {
    if (!data) throw new Error("Cannot sign empty data")
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", this.keyPair.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  async verify(data: string, signature: string): Promise<boolean> {
    if (!data || !signature) return false
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", this.keyPair.publicKey, sig, enc)
  }
}

;(async () => {
  const signer = await SigningEngine.create()
  const payload = "Hello Solana"
  const signature = await signer.sign(payload)
  const ok = await signer.verify(payload, signature)
  console.log({ signature, ok })
})()
