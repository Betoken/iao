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
    if (typeof(getUrlParameter('ref')) != 'undefined') {
        $('#referred_msg').show();
    }

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
        var steps = ['flow_start', 'flow_metamask_confirm', 'flow_ledger_confirm', 'flow_submitted'];
        for (var i in steps) {
            $(`#${steps[i]}`).css({'display': 'none'});
        }
        $(`#${stepId}`).css({'display': 'inline-block'});
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
        var register = () => {
            var symbol = $('#dropdown')[0].value;
            var amountInDAI = window.payAmountInDAI;
            var referrer = getUrlParameter('ref');
            referrer = typeof(referrer) === 'undefined' ? '0x0000000000000000000000000000000000000000' : referrer;
            var txCallback = (txHash) => {
                $('#tx_link').attr('href', `https://etherscan.io/tx/${txHash}`);
                $('#invite_link').val(`https://betoken.fund/iao/?ref=${window.web3.eth.defaultAccount}`);
                $('#share_twitter').attr('data-url', `https://betoken.fund/iao/?ref=${window.web3.eth.defaultAccount}`);
                setFlowStep('flow_submitted');
            };
            switch (symbol) {
                case 'ETH':
                    return window.registerWithETH(amountInDAI, referrer, txCallback);
                case 'DAI':
                    return window.registerWithDAI(amountInDAI, referrer, txCallback);
                default:
                    return window.registerWithToken(symbol, amountInDAI, referrer, txCallback);
            }
        }
        if (e.currentTarget.id === 'metamask_btn') {
            window.loadWeb3(false).then((success) => {
                if (success) {
                    // transition to confirm page
                    $('.address_display').val(window.IAO_ADDRESS); // display address
                    setFlowStep('flow_metamask_confirm');

                    // register
                    register();
                }
            });
        } else if (e.currentTarget.id === 'ledger_btn') {
            window.loadWeb3(true).then((success) => {
                if (success) {
                    // transition to confirm page
                    setFlowStep('flow_ledger_confirm');

                    // register
                    register();
                } else {
                    alert("Your browser doesn't support Ledger. Please switch to Chrome or Brave on a desktop computer.");
                }
            });
        }
    });

    // load token dropdown
    var dropdown = $('#dropdown');
    window.getTokenList().then(
        (tokens) => {
            $.each(tokens, (i) => {
                info = tokens[i];
                dropdown.append($("<option />").val(info.symbol).text(`${info.name} (${info.symbol})`));
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