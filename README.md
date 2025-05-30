# hDCX

Simplest Wallet Core SDK for Typescript

With just simple interfaces, you can significantly simplify the credential managing logic in you project. And it also covered in all aspects of speed, robustness, security and privacy to help you build a better experience.

- Fast and lightweight credential managing
- Simple interfaces, easy to understand and use
- Developer friendly, typed and clear error messages

---

<!-- View full documentation on [here]() -->

## Quick Start

```ts
// Initialize wallet
const wallet = new Wallet();

// Request credentials issuance
const session = await wallet.requestIssue(credentialOfferUri);

// Check issuance status: pending | ready | denied | issued | expired
const status = await session.getStatus();

// Get credentials when status is ready
if (status === "ready") {
  const credentials = await session.getCredentials({
    credentialType: "UniversityDegreeCredential",
    txCode: "1234",
    preAuthorizedCode: "Xyz123",
  });

  // Save Credentials
  await wallet.save(credentials);
}

// Load Credentials
const loadedCredentials = await wallet.load();

// Present Credentials
const presentation = await wallet.present(loadedCredentials);

// Validate Credentials
const validation = await wallet.validate(presentation);
```

In this example, you can easily

- request credentials
- save & load credentials
- present credentials
- validate credentials

![img](/assets/wallet.png)

## Interoperability

We are interoperable with

| Name        | Interoperable |
| ----------- | ------------- |
| Lissi       | ⌛            |
| Amino Funke | ⌛            |

## License

MIT
