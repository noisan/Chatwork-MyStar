// ==UserScript==
// @name        Chatwork MyStar
// @namespace   http://none.none
// @description see manifest.json
// @include     *
// @version     1
// @grant       none
// ==/UserScript==

function star() {
    var items = document.querySelectorAll('#_timeLine ._message ._timeStamp');
    if (items){
        for (var i = 0; i < items.length; i++) {
            if (items[i].dataset && items[i].dataset.mystar) {
                continue;
            }
            items[i].dataset.mystar = 1;

            /* memo: https://developer.mozilla.org/ja/docs/Web/API/Element/classList */
            var starIcon = document.createElement('p');
            starIcon.classList.add('myStar_button');
            starIcon.addEventListener('click', toggleStar);
            updateStarIcon(starIcon);

            items[i].appendChild(starIcon);

            starIcon.dataset.key = getStarKey(starIcon);
            loadStar(starIcon);
        }
    }

    toolbar();  // とりあえず動くように
}

function loadStar(starIcon) {
    var key = starIcon.dataset.key;
    if (!key) {
        return;  // 何らかの理由でメッセージIDが設定できていない？
    }

    chrome.storage.sync.get(key, function(result) {
        setStar(starIcon, result[key]);
    });
}

function saveStar(starIcon) {
    var key = starIcon.dataset.key;
    if (!key) {
        return;
    }

    if (isStarred(starIcon)) {
        var pair = {};
        pair[key] = starIcon.dataset.starredAt;
        chrome.storage.sync.set(pair, function() {});
    } else {
        chrome.storage.sync.remove(key, function() {});
    }
}

function toggleStar(ev) {
    var starIcon = ev.target;
    setStar(starIcon, isStarred(starIcon) ? false : Date.now());
    saveStar(starIcon);
}

function setStar(starIcon, value) {
    starIcon.classList.toggle('myStar_button_clicked', !!value);
    if (value) {
        starIcon.dataset.starredAt = value;
        starIcon.closest('._message').dataset.starredAt = value;
    } else {
        delete starIcon.dataset.starredAt;
        delete starIcon.closest('._message').dataset.starredAt;
    }
    updateStarIcon(starIcon);
}

function updateStarIcon(starIcon) {
    if (isStarred(starIcon)) {
        starIcon.textContent = '★';
    } else {
        starIcon.textContent = '☆';
    }
}

function isStarred(starIcon) {
    return starIcon.classList.contains('myStar_button_clicked');
}

function getStarKey(starIcon) {
    var parent = starIcon.closest('._message');
    if (!parent || !parent.dataset.mid) {
        // HTML構造が変わった？
        return;
    }

    var room = parent.dataset.rid;
    var msg  = parent.dataset.mid;
    return 'star-' + room + '-' + msg;
}

var css =
'.myStar_button {' +
    'display: inline;' +
    'color: silver;'   +
    'font-size: 180%;' +
    'line-height: 100%;' +
    'vertical-align: middle;' +
    'border: 1px solid transparent;' +
    'margin-left: 2px;' +
'}' +
'.myStar_button:hover {' +
    'background-color: #FF9;' +
    'cursor: pointer;' +
    '-webkit-border-radius: 3px;' +
    '-moz-border-radius: 3px;' +
    'border-radius: 3px;' +
    'border: 1px solid #B1D6ED;' +
    'box-sizing: border-box;' +
'}' +
'.myStar_button_clicked {' +
    'color: #FFD76E;' +
'}' +

'.myStar_view {' +
    'display: inline;' +
    'margin-left: 1em;' +
    'padding: 5px;' +
    'color: gray;'   +
    'font-size: 90%;' +
    'font-weight: normal;' +
    'line-height: 100%;' +
    'vertical-align: middle;' +
    'border-radius: 3px;' +
    'border: 1px solid #B1D6ED;' +
'}' +
'.myStar_view:before {' +
    'content: "☆";' +
    'font-size: 120%;' +
    'vertical-align: middle;' +
'}' +
'.myStar_view:hover {' +
    'background-color: #FF9;' +
    'cursor: pointer;' +
    '-webkit-border-radius: 3px;' +
    '-moz-border-radius: 3px;' +
    'border-radius: 3px;' +
    'border: 1px solid #B1D6ED;' +
'}' +
'.myStar_view_clicked {' +
    'font-weight: bold;' +
    'border-color: #FFD76E;' +
    'background-color: #FF9;' +
'}' +
'.myStar_view_clicked:before {' +
    'content: "★";' +
    'font-size: 120%;' +
    'color: #FFD76E;' +
    'vertical-align: baseline;'+
'}';

var myStarStyle = document.createElement('style');
if (myStarStyle.styleSheet) {
    myStarStyle.styleSheet.cssText = css;
} else {
    myStarStyle.appendChild(document.createTextNode(css));
}
document.getElementsByTagName('head')[0].appendChild(myStarStyle);

var isStarOnly = false;
var oldScroll = null;

star();
window.addEventListener('DOMContentLoaded', star, false);

var timer = 0;
document.addEventListener('DOMNodeInserted', function() {
    if (timer) {
        return;
    }
    timer = setTimeout(function() { star(); timer = 0; }, 30);
}, false);


function toolbar() {
    var roomTitle = document.querySelector('#_roomTitle');
    if (!roomTitle) {
        return;  // まだ準備できていない？
    }
    if (roomTitle.querySelector('.myStar_view')) {
        return;  // 既に処理済み
    }

    var starMode = document.createElement('div');
    starMode.textContent = 'スター付き';
    starMode.classList.add('myStar_view');
    starMode.addEventListener('click', function () {
        toggleView(starMode);
    });

    roomTitle.appendChild(starMode);

    // スター表示設定を引き継ぐ
    starMode.classList.toggle('myStar_view_clicked', isStarOnly);
    updateView();
}

function toggleView(starMode) {
    isStarOnly = starMode.classList.toggle('myStar_view_clicked');
    updateView();
}

function updateView() {
    var s = document.getElementById('mystar_style');
    if (s) {
        s.remove();
    }

    if (!isStarOnly) {
        // すべて表示
        var s = document.getElementById('mystar_style');
        if (s) {
            s.remove();
        }

        if (oldScroll !== null) {
            // スクロールがリセットされて鬱陶しいので一番下からの差分位置に戻す
            var timeLine = document.getElementById('_timeLine');
            timeLine.scrollTop = timeLine.scrollHeight - oldScroll;
            oldScroll = null;
        }
        return;
    }

    // スクロール位置を必ずbottomからの差分で記録しておく
    var timeLine = document.getElementById('_timeLine');
    oldScroll = timeLine.scrollHeight - timeLine.scrollTop;

    // スター付きに関係する要素のみ表示
    var css = '#_timeLine ._message:not([data-starred-at]) { overflow: hidden; visibility: hidden; height: 0px; margin: 0; padding: 0; border: 0; }';
    css += '.dateHead { display: none; } .chatTimeLine { padding-top: 0.5em; }';

    var s = document.createElement('style');
    s.id = 'mystar_style';
    if (s.styleSheet) {
        s.styleSheet.cssText = css;
    } else {
        s.appendChild(document.createTextNode(css));
    }
    document.getElementsByTagName('head')[0].appendChild(s);

    // 日付も必要な箇所だけ表示
    var timer = 0;
    document.addEventListener('DOMNodeInserted', function() {
        if (timer) {
            return;
        }
        timer = setTimeout(function() {
            var dateHeaders = document.querySelectorAll('.dateHead');
            for (i = 0; i < dateHeaders.length; i++) {
                var e = dateHeaders[i].nextElementSibling;
                // 次の日付ラベルまでに1つでもスター付きメッセージがあればその日付は残す
                while (e.classList.contains('_message')) {
                    if (e.dataset.starredAt) {
                        dateHeaders[i].style.display = 'block';
                        /*
                        dateHeaders[i].style.overflow = 'visible';
                        dateHeaders[i].style.visibility = 'visible';
                        dateHeaders[i].style.height     = 'initial';
                        */
                        break;
                    }
                    e = e.nextElementSibling;
                }
            }
            timer = 0;
        }, 30);
    }, false);
}

// これを使えば別マシンでスターを操作した場合にも同期できる？
/*
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace == "sync") {
    if (changes.foo) {
      someProcess(changes.foo.newValue);
    }
  }
});
*/
