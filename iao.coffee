Web3 = require "web3"
iaoABI = require "./iao_abi.json"
erc20ABI = require "./erc20_abi.json"

IAO_ADDRESS = "0xD39fBd481f051F7E801D5A764EDcA6dD00b604FC"

# loads web3 as a global variable
loadWeb3 = (useLedger, network) ->
    if useLedger
        # Use ledger-wallet-provider to load web3
        ProviderEngine = require "web3-provider-engine"
        RpcSubprovider = require "web3-provider-engine/subproviders/rpc"
        LedgerWalletSubproviderFactory = (require "ledger-wallet-provider").default

        engine = new ProviderEngine
        window.web3 = new Web3 engine

        ledgerWalletSubProvider = async LedgerWalletSubproviderFactory()
        engine.addProvider ledgerWalletSubProvider
        engine.addProvider new RpcSubprovider {
            rpcUrl: "https://#{network}.infura.io/v3/7a7dd3472294438eab040845d03c215c"
        }
        engine.start()
    else
        # Use Metamask/other dApp browsers to load web3
        # Modern dapp browsers...
        if window.ethereum?
            window.web3 = new Web3 ethereum
            try
                # Request account access if needed
                await ethereum.enable()
                # Acccounts now exposed
            catch error
                # User denied account access...

        # Legacy dapp browsers...
        else if window.web3?
            window.web3 = new Web3 web3.currentProvider
            # Acccounts always exposed
        
        # Non-dapp browsers...
        else
            # TODO: show need-metamask message
            console.log "Non-Ethereum browser detected. You should consider trying MetaMask!"

# returns the IAO contract object
IAOContract = () ->
    if !web3?
        return
    return new web3.eth.Contract iaoABI, IAO_ADDRESS

# returns the ERC20 contract object with given address
ERC20Contract = (address) ->
    if !web3?
        return
    return new web3.eth.Contract erc20ABI, address

