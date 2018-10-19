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
    if (typeof(getUrlParameter('referrer')) != 'undefined') {
        $('#referred_msg').show();
    }

    // helpers
    updatePayAmount = (symbol) => {
        $('#pay_token_amount').text('loading...');
        return window.getAccountPriceInTokens(symbol, window.payAmountInDAI).then((price) => {
            $('#pay_token_amount').text(`${price} ${symbol}`);
            return price;
        });
    }
    updateETHPrice = () => {
        $('#eth_price').text('loading...');
        return window.getAccountPriceInTokens("ETH", window.payAmountInDAI).then((price) => {
            $('#eth_price').text(price);
            return price;
        });
    }

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
            var referrer = getUrlParameter('referrer');
            referrer = typeof(referrer) === 'undefined' ? '0x0000000000000000000000000000000000000000' : referrer;
            switch (symbol) {
                case 'ETH':
                    return window.registerWithETH(amountInDAI, referrer);
                case 'DAI':
                    return window.registerWithDAI(amountInDAI, referrer);
                default:
                    return window.registerWithToken(symbol, amountInDAI, referrer);
            }
        }
        if (e.currentTarget.id === 'metamask_btn') {
            window.loadWeb3(false).then(register);
        } else if (e.currentTarget.id === 'ledger_btn') {
            window.loadWeb3(true, 'mainnet').then(register);
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