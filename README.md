# :triangular_flag_on_post: Audio Fi

A chain platform for the creator economy built using Nerochain, which ensures flexibility, efficiency, and fairness through Blockspace 2.0, a groundbreaking approach to controlling transaction costs and resources.

## :star2: Product Description: AudioFi

AudioFi is a revolutionary Web3-powered platform where content creators and audiences interact in a new tokenized economy. Creators host audio sessions, earn tokens from audience staking, and mint Audio NFTs that appreciate in value based on engagement metrics.
Audience members can stake on Audio NFT using AFT Tokens to earn rewards as creator popularity grows.

By leveraging Nerochain, the platform offers flexible options for gas fee payments.
  #### :pushpin: Payment Options
    1. Sponsored Transactions (Free): Developers can fully cover gas costs for users.
    2. ERC20 Token Payments: Users can pay gas fees using supported ERC20 tokens instead of NERO.
    3. Pre-fund/Post-fund Models: Choose between upfront payments or after-execution settlements.

  ###### :rocket: Free transactions are limited to three times per month.













![AudioFi](https://github.com/user-attachments/assets/24e5cf27-edc7-497c-9118-6de29ddee2f0)

## :star2: Transaction Flow using AAWallet

###   :pencil:  Connection Phase

The journey begins when a user connects to a dApp. This initial connection establishes the communication channel between the user’s browser and the blockchain. During this phase, the user authenticates using their preferred method (MetaMask, social login, password, etc.), and the dApp identifies their AA wallet address, which may be a counterfactual address if the wallet hasn’t been deployed yet.

###   :pencil:  UserOperation Construction Phase

Once connected, the transaction preparation process begins. When a user initiates an action, such as staking AFT or minting an NFT, the dApp constructs a UserOperation either directly or through the Developer SDK. Unlike traditional transactions, UserOperations include additional fields necessary for account abstraction.
If gas abstraction is desired, the Developer SDK communicates with the Paymaster API to determine payment options. For token-based payments, the Price Service calculates the exact token amount needed based on current exchange rates and expected gas consumption. The Paymaster API then returns the paymasterAndData field, which includes all necessary information for gas handling.

This modular approach allows developers to offer flexible payment options without modifying their core application logic. Users can choose to pay with tokens they already have rather than acquiring the native token specifically for gas fees.

###   :pencil:  Transaction Submission Phase

With the UserOperation constructed and signed, the submission process begins. The dApp sends the complete UserOperation to the Wallet SDK, which handles the interaction with the user to obtain their signature. This might involve a popup in MetaMask or an in-app signature request, depending on the authentication method.

After signing, the AA Wallet forwards the UserOperation to the Bundlers. These specialized services collect operations from multiple users to optimize gas usage and increase efficiency. By batching operations together, Bundlers can reduce the per-operation cost significantly.

###  :pencil:  Execution Phase

The final stage occurs when the Bundler has collected enough operations or reached a time threshold. The Bundler creates a transaction calling the EntryPoint contract with a batch of UserOperations. The EntryPoint then processes each operation sequentially.

For each operation, the EntryPoint verifies the signature, checks that gas requirements are met (either through the user’s wallet balance or via a Paymaster), and then calls the user’s Contract Account to execute the actual transaction logic. If a Paymaster is involved, it handles the gas payment according to the configured strategy.

This multi-step process happens transparently to the end user, who simply sees their transaction being processed and eventually confirmed, similar to a traditional transaction but with enhanced flexibility and potentially lower costs.

![flow diagram](https://github.com/user-attachments/assets/0005a618-ceed-4d55-a78e-9bd9ee86a935)

