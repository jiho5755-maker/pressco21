// 상단 타이틀 변경
changeNaviTitleText('FAQ');

$('.cw-faqlist .question').click(function(){$(this).add(this.nextElementSibling).toggleClass('on')});