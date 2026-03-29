// 상단 타이틀 변경
changeNaviTitleText('매장안내');

document.addEventListener('DOMContentLoaded', function () {
    const storeList = document.querySelector('#MS_store_list');

   storeList.addEventListener('click', function (e) {
        const target = e.target.closest('.list-info');
        if (!target) return;

        storeList.querySelectorAll('.list-info').forEach(li => li.classList.remove('selected'));
        target.classList.add('selected');
    });

    const applyFirstSelected = () => {
        const listItems = storeList.querySelectorAll('.list-info');
        if (listItems.length > 0) {
            // 기존 selected 없으면 첫 번째 li에 추가
            if (!storeList.querySelector('.list-info.selected')) {
                listItems[0].classList.add('selected');
                listItems[0].click();
            }
        }
    };

    applyFirstSelected();

    const observer = new MutationObserver(applyFirstSelected);
    observer.observe(storeList, { childList: true, subtree: true });
});