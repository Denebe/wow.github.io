
var markers = [];

var mapContainer = document.getElementById('map'), // 지도를 표시할 div 
    mapOption = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 지도의 중심좌표
        level: 10 // 지도의 확대 레벨
    };

// 지도를 생성합니다    
var map = new kakao.maps.Map(mapContainer, mapOption);



// 장소 검색 객체를 생성합니다
var ps = new kakao.maps.services.Places();

// 검색 결과 목록이나 마커를 클릭했을 때 장소명을 표출할 인포윈도우를 생성합니다
var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

// 키워드로 장소를 검색합니다
searchPlaces();

function search_buzz_func(data) {
    var form = {
        "url": "http://125.187.189.59:9200/instagram-test-*/_search",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json"
        },
        "data": JSON.stringify({
            "query": {
                "bool": {
                    "must": {
                        "match": {
                            "location": $('#keyword').val(),
                        }
                    },
                    "filter": {
                        "range": {
                            "timestamp": {
                                "gte": moment($('#fromDate').val()).format('YYYY-MM-DDThh:mm:ss.SSS[Z]'),
                                "lte": moment($('#toDate').val()).format('YYYY-MM-DDThh:mm:ss.SSS[Z]')
                            }
                        }
                    }
                }
            },
            "size": 500,
            "_source": ["timestamp", "location", "buzz"],
            "sort": {
                "timestamp": {
                    "order": "desc"
                }
            }
        })
    };
    $.ajax(form)
        .done(function (res) {
            setInfo($(res.hits.hits));
            displayPlaces(data, res.hits.hits.length);
        })
        .fail(function (xhr, status, errorThrown) {
            console.log("xhr : ", xhr);
            console.log("Status : ", status);
            console.log("errorThrown : ", errorThrown);
        })

}
function setInfo(obj) {
    console.log(obj);
    $('#topTable > tbody').empty();
    $('#topTable > tbody:last').append('<tr><td>' + $('#keyword').val() + '</td><td>' + obj.length + '</td></tr>');
    $('#bottomTable > tbody').empty();
    for (i = 0; i < obj.length; i++) {
        $('#bottomTable > tbody:last').append('<tr><td>' + obj[i]._source.timestamp + '</td><td>' + $('#keyword').val() + '</td><td>' + obj[i]._source.buzz + '</td></tr>');
    }
}


// 키워드 검색을 요청하는 함수입니다
function searchPlaces() {

    var keyword = document.getElementById('keyword').value;

    if (!keyword.replace(/^\s+|\s+$/g, '')) {
        alert('키워드를 입력해주세요!');
        return false;
    }

    // 장소검색 객체를 통해 키워드로 장소검색을 요청합니다
    ps.keywordSearch(keyword, placesSearchCB);
}

// 장소검색이 완료됐을 때 호출되는 콜백함수 입니다
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {

        // 정상적으로 검색이 완료됐으면
        // 검색 목록과 마커를 표출합니다
        search_buzz_func(data);

        // 페이지 번호를 표출합니다
        displayPagination(pagination);

    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {

        alert('검색 결과가 존재하지 않습니다.');
        return;

    } else if (status === kakao.maps.services.Status.ERROR) {

        alert('검색 결과 중 오류가 발생했습니다.');
        return;

    }
}



// 검색 결과 목록과 마커를 표출하는 함수입니다
function displayPlaces(places, buzz_length) {

    var listEl = document.getElementById('placesList'),
        menuEl = document.getElementById('menu_wrap'),
        fragment = document.createDocumentFragment(),
        bounds = new kakao.maps.LatLngBounds(),
        listStr = '';

    // 검색 결과 목록에 추가된 항목들을 제거합니다
    removeAllChildNods(listEl);

    // 지도에 표시되고 있는 마커를 제거합니다
    removeMarker();

    for (var i = 0; i < places.length; i++) {

        // 마커를 생성하고 지도에 표시합니다
        var placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(buzz_length, placePosition, i),
            itemEl = getListItem(i, places[i]); // 검색 결과 항목 Element를 생성합니다

        // 검색된 장소 위치를 기준으로 지도 범위를 재설정하기위해
        // LatLngBounds 객체에 좌표를 추가합니다
        bounds.extend(placePosition);

        // 마커와 검색결과 항목에 mouseover 했을때
        // 해당 장소에 인포윈도우에 장소명을 표시합니다
        // mouseout 했을 때는 인포윈도우를 닫습니다
        (function (marker, title) {
            kakao.maps.event.addListener(marker, 'mouseover', function () {
                displayInfowindow(marker, title);
            });

            kakao.maps.event.addListener(marker, 'mouseout', function () {
                infowindow.close();
            });

            itemEl.onmouseover = function () {
                displayInfowindow(marker, title);
            };

            itemEl.onmouseout = function () {
                infowindow.close();
            };
        })(marker, places[i].place_name);

        fragment.appendChild(itemEl);
    }

    // 검색결과 항목들을 검색결과 목록 Elemnet에 추가합니다
    listEl.appendChild(fragment);
    menuEl.scrollTop = 0;

    // 검색된 장소 위치를 기준으로 지도 범위를 재설정합니다
    map.setBounds(bounds);
}

// 검색결과 항목을 Element로 반환하는 함수입니다
function getListItem(index, places) {

    var el = document.createElement('li'),
        itemStr = '<span class="markerbg marker_' + (index + 1) + '"></span>' +
            '<div class="info">' +
            '   <h5>' + places.place_name + '</h5>';

    if (places.road_address_name) {
        itemStr += '    <span>' + places.road_address_name + '</span>' +
            '   <span class="jibun gray">' + places.address_name + '</span>';
    } else {
        itemStr += '    <span>' + places.address_name + '</span>';
    }

    itemStr += '  <span class="tel">' + places.phone + '</span>' +
        '</div>';

    el.innerHTML = itemStr;
    el.className = 'item';

    return el;
}



// 마커를 생성하고 지도 위에 마커를 표시하는 함수입니다
function addMarker(buzz_length, position, idx) {

    if (idx == 0) {
        for (var i = 0; i < buzz_length; i++) {
            //var mapObj = kakao.map.Map(mapContainer, {center : new kakao.maps.LatLng(x,y)})
            marker = new kakao.maps.Marker({
                position: position
            });

            clusterer.addMarker(marker);
        }
    }
    /*
    else
    {
        marker = new kakao.maps.Marker({
            position: position
        });
    
        clusterer.addMarker(marker);
    }
    */
    //marker.setVisible(false);

    return marker;
}

// 지도 위에 표시되고 있는 마커를 모두 제거합니다
function removeMarker() {
    clusterer.clear();
}

// 검색결과 목록 하단에 페이지번호를 표시는 함수입니다
function displayPagination(pagination) {
    var paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(),
        i;

    // 기존에 추가된 페이지번호를 삭제합니다
    while (paginationEl.hasChildNodes()) {
        paginationEl.removeChild(paginationEl.lastChild);
    }

    for (i = 1; i <= pagination.last; i++) {
        var el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;

        if (i === pagination.current) {
            el.className = 'on';
        } else {
            el.onclick = (function (i) {
                return function () {
                    pagination.gotoPage(i);
                }
            })(i);
        }

        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}

// 검색결과 목록 또는 마커를 클릭했을 때 호출되는 함수입니다
// 인포윈도우에 장소명을 표시합니다
function displayInfowindow(marker, title) {
    var content = '<div style="padding:5px;z-index:1;">' + title + '</div>';

    infowindow.setContent(content);
    infowindow.open(map, marker);
}

// 검색결과 목록의 자식 Element를 제거하는 함수입니다
function removeAllChildNods(el) {
    while (el.hasChildNodes()) {
        el.removeChild(el.lastChild);
    }
}

var clusterer = new kakao.maps.MarkerClusterer({
    map: map, // 마커들을 클러스터로 관리하고 표시할 지도 객체 
    averageCenter: true, // 클러스터에 포함된 마커들의 평균 위치를 클러스터 마커 위치로 설정 
    minLevel: 1, // 클러스터 할 최소 지도 레벨 
    calculator: [100, 300, 500], // 클러스터의 크기 구분 값, 각 사이값마다 설정된 text나 style이 적용된다
    texts: getTexts, // texts는 ['삐약', '꼬꼬', '꼬끼오', '치멘'] 이렇게 배열로도 설정할 수 있다 
    styles: [{ // calculator 각 사이 값 마다 적용될 스타일을 지정한다
        width: '100px', height: '100px',
        background: 'rgba(55, 255, 106, .8)',
        borderRadius: '50px',
        color: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
        opacity: '0.8',
        lineHeight: '31px'
    },
    {
        width: '150px', height: '150px',
        background: 'rgba(255, 127, 0, .8)',
        borderRadius: '75px',
        color: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
        opacity: '0.8',
        lineHeight: '41px'
    },
    {
        width: '200px', height: '200px',
        background: 'rgba(255, 82, 82, .8)',
        borderRadius: '100px',
        color: '#000',
        textAlign: 'center',
        fontWeight: 'bold',
        opacity: '0.8',
        lineHeight: '51px'
    }
    ]
});

// 클러스터 내부에 삽입할 문자열 생성 함수입니다 
function getTexts(count) {
    if (count > 1) {
        // 한 클러스터 객체가 포함하는 마커의 개수에 따라 다른 텍스트 값을 표시합니다 
        return count + "버즈량";
    }
}
