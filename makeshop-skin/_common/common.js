// 입력폼 class 추가
document.addEventListener("DOMContentLoaded", () => {
    const labels = document.querySelectorAll('label');
    if (labels.length) {
      labels.forEach(label => label.classList.add('form-check-label'));
    }

    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    if (inputs.length) {
      inputs.forEach(input => input.classList.add('form-check-input'));
    }

    const textInputs = document.querySelectorAll('input[type="text"],input[type="password"], input[type="date"], textarea');
    if (textInputs.length) {
      textInputs.forEach(textfield => textfield.classList.add('cw-textfield'));
    }

    const selects = document.querySelectorAll('select');
    if (selects.length) {
      selects.forEach(select => select.classList.add('cw-select-box'));
    }
});


// 스킨 반응형
$(function() {
    var $topBanner = $('#topbanner');
    var $container = $('#container');
    if (!$topBanner.length || !$container.length) return;

    function adjustPadding() {
        var paddingTop = ($(window).width() >= 768) ? '0' : '104px';
        $container.css('padding-top', paddingTop);
    }

    var resizeTimer;
    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(adjustPadding, 100);
    });

    adjustPadding();
});