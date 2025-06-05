# hDCX

**The Simplest Wallet Core SDK in Typescript.**<br/><br/>
_Effortless credential handling. Fully standards-compliant._

- Minimal API surface: intuitive and easy to integrate
- Fast and lightweight: ideal for web, mobile, and embedded environments
- Fully compliant: aligns with modern standards like SD-JWT, W3C VC, and eIDAS 2.0

### Supported Standards

| eIDAS 2.0  | W3C VCDM                    | SD-JWT VC   | OIDC4VCI    | OIDC4VP     | ISO/IEC 18013   | Token Status List |
| ---------- | --------------------------- | ----------- | ----------- | ----------- | --------------- | ----------------- |
| ARF 2.0 ✅ | VCDM 2.0 ✅/ 1.4 ✅/ 1.1 ✅ | draft 09 ✅ | draft 15 ✅ | draft 28 ✅ | Part 5 / Part 7 | draft 11 ✅      |
 
<!-- View full documentation on [here]() -->

## Quick Start

### Wallet initialization

```ts
// Initialize wallet
const wallet = new Wallet();
```

### Recieve and save credentials

```ts
// You get the url or data for issued credentials
const issuePayload = await scanQRCode(); // or deeplink or NFC/BLE

// The library will recognize the method and will get it for you
const credentials = await wallet.receive(issuePayload);

// Then you can save credentials
await wallet.save(credentials);
```

### Load and present credentials

```ts
// Load credentials with query
const credentials = await wallet.load(["name", "age"]);

// Present Credentials
const presentation = await wallet.present(credentials);
```

![img](/assets/wallet.png)

## Backwards compatibility

| SD-JWT VC   | OIDC4VCI                 | OIDC4VP     | Token Status List |
| ----------- | ------------------------ | ----------- | ----------------- |
| draft 07    | Implementors draft v1    | draft 20    | draft 05          |

## Interoperability

We are interoperable with

| Name        | Interoperable |
| ----------- | ------------- |
| Lissi       | ⌛            |
| Amino Funke | ⌛            |

## License

MIT
