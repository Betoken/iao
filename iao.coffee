# libraries
Web3 = require "web3"
fetch = require "node-fetch"

# smart contract ABI's
iaoABI = require "./iao_abi.json"
erc20ABI = require "./erc20_abi.json"

# smart contract addresses
IAO_ADDRESS = "0x71C20308070d58983a7D96C73927E5145e908121"


#
# HELPERS
#

# loads web3 as a global variable
loadWeb3 = (useLedger, network) ->
    if useLedger
        # Use ledger-wallet-provider to load web3
        ProviderEngine = require "web3-provider-engine"
        RpcSubprovider = require "web3-provider-engine/subproviders/rpc"
        LedgerWalletSubproviderFactory = (require "ledger-wallet-provider").default

        engine = new ProviderEngine
        window.web3 = new Web3 engine

        networkId = if network == "mainnet" then 1 else 3
        ledgerWalletSubProvider = await LedgerWalletSubproviderFactory(
            () -> networkId,
            "44'/60'/0'/0"
        )
        engine.addProvider ledgerWalletSubProvider
        engine.addProvider new RpcSubprovider {
            rpcUrl: "https://#{network}.infura.io/v3/7a7dd3472294438eab040845d03c215c"
        }
        engine.start()
    else
        # Use Metamask/other dApp browsers to load web3
        # Modern dapp browsers...
        if window.ethereum
            window.web3 = new Web3 ethereum
            try
                # Request account access if needed
                await ethereum.enable()
                # Acccounts now exposed
            catch error
                # User denied account access...

        # Legacy dapp browsers...
        else if window.web3
            window.web3 = new Web3 web3.currentProvider
            # Acccounts always exposed
        
        # Non-dapp browsers...
        else
            alert("Non-Ethereum browser detected. You should consider trying MetaMask!")
    
    # set default account
    web3.eth.defaultAccount = (await web3.eth.getAccounts())[0]

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


#
# INFO GETTERS
#

# returns list of token pairs & prices
# Format:
# {
#   "ETH_OMG":
#       {
#           "symbol": "OMG",
#           "name": "OmiseGO",
#           "contractAddress": "0xd26114cd6ee289accf82350c8d8487fedb8a0c07",
#           "decimals": 18,
#           "currentPrice": 0.0225310175897248,
#           "lastPrice": 0.0221079406797047,
#           "lastTimestamp": 1522654595,
#           "baseVolume": 6.9014983,
#           "quoteVolume": 319.9424158830901
#       },
#   … (other token pairs)
# }
getTokenPairs = () ->
    request = await fetch "https://tracker.kyber.network/api/tokens/pairs"
    tokensInformation = await request.json()
    return tokensInformation

# returns list of supported tokens
# Format:
# [
#     {
#         "symbol":"ZIL",
#         "cmcName":"ZIL",
#         "name":"Zilliqa",
#         "decimals":12,
#         "contractAddress":"0x05f4a42e251f2d52b8ed15e9fedaacfcef1fad27"
#     },
#     … (other tokens' information)
# ]
getTokenList = () ->
    request = await fetch "https://tracker.kyber.network/api/tokens/supported"
    tokensInformation = await request.json()
    return tokensInformation

# get info of a token, given its symbol (ticker)
getTokenInfo = (symbol) ->
    tokenPairs = await getTokenPairs()
    return tokenPairs["ETH_#{symbol}"]

# get the price of the account in terms of the given token.
# amountInDAI is the price of the account in DAI
getAccountPriceInTokens = (symbol, amountInDAI) ->
    if symbol != "ETH"
        tokenInfo = await getTokenInfo(symbol)
        daiInfo = await getTokenInfo("DAI")

        ethPerToken = tokenInfo.currentPrice
        ethPerDAI = daiInfo.currentPrice
        tokenPerDAI = ethPerDAI / ethPerToken
        return tokenPerDAI * amountInDAI
    else
        tokenInfo = await getTokenInfo("DAI")
        ethPerDAI = tokenInfo.currentPrice
        return ethPerDAI * amountInDAI


#
# REGISTRATION
#

# register with DAI. amountInDAI should be in DAI (not wei).
registerWithDAI = (amountInDAI, referrer) ->
    # init
    amountInWei = amountInDAI * 1e18
    tokenInfo = await getTokenInfo("DAI")
    iaoContract = await IAOContract()
    tokenContract = await ERC20Contract(tokenInfo.contractAddress)

    # approve token amount
    await tokenContract.methods.approve(IAO_ADDRESS, amountInWei).send({
        from: web3.eth.defaultAccount
        gas: await tokenContract.methods.approve(IAO_ADDRESS, amountInWei).estimateGas({
            from: web3.eth.defaultAccount
        })
    })

    # register
    await iaoContract.methods.registerWithDAI(
        amountInWei, referrer).send({
            from: web3.eth.defaultAccount
            gas: await iaoContract.methods.registerWithDAI(amountInWei, referrer).estimateGas({
                from: web3.eth.defaultAccount
            })
        }
    )

# register with ETH. amountInDAI should be in DAI (not wei).
registerWithETH = (amountInDAI, referrer) ->
    # init
    tokenInfo = await getTokenInfo("DAI")
    iaoContract = await IAOContract()

    # calculate ETH amount
    ethPerDAI = tokenInfo.currentPrice
    amountInWei = amountInDAI * ethPerDAI * 1e18

    # register
    await iaoContract.methods.registerWithETH(referrer).send(
        {
            from: web3.eth.defaultAccount
            gas: await iaoContract.methods.registerWithETH(referrer).estimateGas({
                from: web3.eth.defaultAccount
                value: amountInWei
            })
            value: amountInWei
        }
    )

# register with an ERC20 token. amountInDAI should be in DAI (not wei).
registerWithToken = (symbol, amountInDAI, referrer) ->
    # init
    tokenInfo = await getTokenInfo(symbol)
    daiInfo = await getTokenInfo("DAI")

    iaoContract = await IAOContract()
    tokenContract = await ERC20Contract(tokenInfo.contractAddress)

    # calculate amount in tokens
    ethPerToken = tokenInfo.currentPrice
    ethPerDAI = daiInfo.currentPrice
    tokenPerDAI = ethPerDAI / ethPerToken
    amountInTokenUnits = amountInDAI * tokenPerDAI * Math.pow(10, tokenInfo.decimals)

    # approve token amount
    await tokenContract.methods.approve(IAO_ADDRESS, amountInTokenUnits)
        .send(
            {
                from: web3.eth.defaultAccount
                gas: await tokenContract.methods.approve(IAO_ADDRESS, amountInTokenUnits).estimateGas({
                    from: web3.eth.defaultAccount
                })
            }
    )

    # register
    await iaoContract.methods.registerWithToken(
        tokenInfo.contractAddress,
        amountInTokenUnits,
        referrer).send(
        {
            from: web3.eth.defaultAccount
            gas: await iaoContract.methods.registerWithToken(tokenInfo.contractAddress,
                amountInTokenUnits,
                referrer).estimateGas({
                from: web3.eth.defaultAccount
            })
        }
    )


# export functions to window
window.loadWeb3 = loadWeb3
window.getTokenList = getTokenList
window.getAccountPriceInTokens = getAccountPriceInTokens
window.registerWithDAI = registerWithDAI
window.registerWithETH = registerWithETH
window.registerWithToken = registerWithToken