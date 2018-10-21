var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

NO_WEB3_ERR = "You need a Web3-enabled browser, like Metamask, Brave, Status, and Cipher, in order to use \"Continue with Metamask\". Don't forget, you can always transfer Ether directly to iao.betokenfund.eth to participate in the IAO!";
LEDGER_ERR = "We're having trouble connecting to your Ledger Wallet. Please make sure:\n• You are using Chrome or Brave on a desktop computer.\n• Your Ledger is properly plugged in.\n• You have logged into your Ledger.\n• You have launched the Ethereum App on your Ledger.\n• \"Browser Support\" has been enabled in the Ethereum App's settings.\n"
TX_ERR = "It would seem that one of the following has happened:\n• You have already participated in the IAO\n• You have insufficient funds\n• You have rejected the transaction\n• Something unexpected has happened\nPlease reject all transactions you see right now."

$(document)
.ready(() => {
    // init
    window.payAmountInDAI = 50;
    $('.ui.checkbox').checkbox({
        onChecked: () => {
            $('.continue').removeClass('disabled');
        },
        onUnchecked: () => {
            $('.continue').addClass('disabled');
        }
    });
    $('.ui.checkbox').checkbox('set unchecked')
    if (typeof(getUrlParameter('ref')) != 'undefined') {
        $('#referred_msg').show();
    }
    $('.address_display').val(window.IAO_ADDRESS); // display address


    // helpers
    var updatePayAmount = (symbol) => {
        $('#pay_token_amount').text('loading...');
        return window.getAccountPriceInTokens(symbol, window.payAmountInDAI).then((price) => {
            $('#pay_token_amount').text(`${price} ${symbol}`);
            return price;
        });
    };
    var updateETHPrice = () => {
        $('#eth_price').text('loading...');
        return window.getAccountPriceInTokens("ETH", window.payAmountInDAI).then((price) => {
            $('#eth_price').text(price);
            return price;
        });
    };
    var setFlowStep = (stepId) => {
        var steps = ['flow_start', 'flow_metamask_confirm', 'flow_ledger_confirm', 'flow_submitted', 'flow_confirmed', 'flow_error'];
        for (var i in steps) {
            $(`#${steps[i]}`).css({'display': 'none'});
        }
        $(`#${stepId}`).css({'display': 'inline-block'});
    };
    var showError = (msg) => {
        $('#error_msg').text(msg);
        setFlowStep('flow_error');
    };


    // load the initial price in ETH
    updateETHPrice().then((price) => {
        $('#pay_token_amount').text(`${price} ETH`);
    });


    // button events
    $('.kro_btn').on('click', (e) => {
        // set payment amount
        window.payAmountInDAI = +e.currentTarget.value; // convert to Number
        // change button highlight
        $('.kro_btn').removeClass('positive');
        $(e.currentTarget).addClass('positive');
        // update prices
        updatePayAmount($('#dropdown')[0].value);
        updateETHPrice();
    });

    $('.continue').on('click', (e) => {
        var symbol = $('#dropdown')[0].value;
        var hasSubmitted = false;
        var register = () => {
            var amountInDAI = window.payAmountInDAI;
            var referrer = getUrlParameter('ref');
            referrer = typeof(referrer) === 'undefined' ? '0x0000000000000000000000000000000000000000' : referrer;
            var txCallback = (txHash) => {
                $('.tx_link').attr('href', `https://etherscan.io/tx/${txHash}`);
                $('.invite_link').val(`https://betoken.fund/iao/?ref=${window.web3.eth.defaultAccount}`);
                $('.share_twitter').attr('href', $('.share_twitter').attr('href') + window.web3.eth.defaultAccount);

                setFlowStep('flow_submitted');
                hasSubmitted = true;
            };
            var errCallback = (err) => {
                console.log(err);
                if (!hasSubmitted) {
                    showError(TX_ERR);
                }
            };
            var confirmCallback = () => {
                setFlowStep('flow_confirmed')
            };

            switch (symbol) {
                case 'ETH':
                    return window.registerWithETH(amountInDAI, referrer, txCallback, errCallback, confirmCallback);
                case 'DAI':
                    return window.registerWithDAI(amountInDAI, referrer, txCallback, errCallback, confirmCallback);
                default:
                    return window.registerWithToken(symbol, amountInDAI, referrer, txCallback, errCallback, confirmCallback);
            }
        }
        // update tx count
        switch (symbol) {
            case 'ETH':
                $('.tx_count').text('1');
                break;
            case 'DAI':
                $('.tx_count').text('2');
                break;
            default:
                $('.tx_count').text('3');
                break;
        }
        // load web3
        if (e.currentTarget.id === 'metamask_btn') {
            window.loadWeb3(false).then((success) => {
                if (success) {
                    // transition to confirm page
                    setFlowStep('flow_metamask_confirm');

                    // register
                    register();
                } else {
                    showError(NO_WEB3_ERR);
                }
            });
        } else if (e.currentTarget.id === 'ledger_btn') {
            // transition to confirm page
            setFlowStep('flow_ledger_confirm');
            window.loadWeb3(true).then((success) => {
                if (success) {
                    // register
                    register();
                } else {
                    showError(LEDGER_ERR);
                }
            });
        }
    });


    // load token dropdown
    var dropdown = $('#dropdown');
    var unsupportedTokens = ['OMG', 'MTL', 'ADX', 'PAY', 'DAT'];
    window.getTokenList().then(
        (tokens) => {
            $.each(tokens, (i) => {
                info = tokens[i];
                if (!unsupportedTokens.includes(info.symbol)) {
                    // filter out unsupported tokens
                    dropdown.append($("<option />").val(info.symbol).text(`${info.name} (${info.symbol})`));
                }
            });
        }
    );
    dropdown.change((e) => {
        updatePayAmount(e.target.value);
    });


    $('.ui.accordion')
        .accordion()
    ;
});