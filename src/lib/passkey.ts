const RP_NAME = "St. Mary's High School";

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function isPasskeySupported(): boolean {
  return !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerPasskey(
  userId: string,
  email: string,
  displayName: string
): Promise<string> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  return bufferToBase64url(credential.rawId);
}

export async function authenticateWithPasskey(): Promise<string> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  return bufferToBase64url(assertion.rawId);
}
