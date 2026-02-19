/**
 * 파트너맵 v3 - 설정 파일
 * 메이크샵 D4 플랫폼 최적화
 * v2 검증된 Google Sheets 기반 아키텍처 유지
 */

var CONFIG = {
    // ========================================
    // 네이버 지도 API (ncpKeyId 인증)
    // ========================================
    naverMapNcpKeyId: 'bfp8odep5r',

    // ========================================
    // Google Sheets API (최종 버전 - 103개 파트너)
    // ========================================
    googleSheetApiUrl: 'https://script.google.com/macros/s/AKfycbzmXFfzQ_Snr8nHsXmXdkrCy-ZSkXQOuZ3FBRfpXSv7aWHXpDCROkcJPssloHJtcKurLA/exec',

    // ========================================
    // 테스트 데이터 설정
    // ========================================
    useTestData: false,  // 개발 시 true, 운영 시 false로 변경
    testDataPath: '/test-data/partners-200.json',

    // ========================================
    // 캐싱 설정
    // ========================================
    cacheKey: 'fresco21_partners_v3',
    cacheVersion: '3.0',
    cacheDuration: 24 * 60 * 60 * 1000,  // 24시간 (밀리초)

    // ========================================
    // 지도 기본 설정
    // ========================================
    defaultCenter: {
        lat: 37.5665,  // 서울 시청
        lng: 126.9780
    },
    defaultZoom: 11,
    clusterZoom: 12,  // 이 줌 레벨 이하에서 클러스터링 활성화 (10→12로 변경하여 초기 로딩 시에도 클러스터링 적용)
    minZoomForMarkers: 8,  // 이 줌 레벨 이상에서만 마커 표시

    // ========================================
    // 파트너 유형별 색상 매핑
    // ========================================
    partnerTypeColors: {
        '협회': '#5A7FA8',
        '인플루언서': '#C9A961',
        'default': '#7D9675'
    },

    // ========================================
    // 카테고리별 색상 매핑 (v2와 동일)
    // ========================================
    categoryColors: {
        '압화': '#FFB8A8',
        '플라워디자인': '#E8D5E8',
        '투명식물표본': '#A8E0C8',
        '캔들': '#F5E6CA',
        '석고': '#F5E6CA',
        '리본': '#D4E4F7',
        '디퓨저': '#F0E4D4',
        'default': '#7D9675'
    },

    // ========================================
    // 검색 설정 (Fuse.js)
    // ========================================
    fuseOptions: {
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'address', weight: 0.3 },
            { name: 'category', weight: 0.2 },
            { name: 'description', weight: 0.1 }
        ],
        threshold: 0.3,  // 낮을수록 엄격한 매칭
        ignoreLocation: true,
        minMatchCharLength: 2
    },

    // ========================================
    // UI 설정
    // ========================================
    toastDuration: 3000,  // 토스트 알림 표시 시간 (밀리초)
    autocompleteLimit: 5,  // 자동완성 최대 표시 개수
    searchMinLength: 2,  // 검색 최소 글자 수
    debounceDelay: 200,  // 검색 입력 디바운스 (밀리초)

    // ========================================
    // 클러스터링 설정
    // ========================================
    clusterGridSize: 60,  // 클러스터링 그리드 크기 (픽셀)
    clusterMinSize: 2,  // 최소 클러스터 크기

    // ========================================
    // GPS 설정
    // ========================================
    gpsSearchRadius: 5,  // GPS 주변 검색 반경 (킬로미터)
    gpsZoomLevel: 13,  // GPS 검색 시 줌 레벨

    // ========================================
    // 즐겨찾기 설정
    // ========================================
    favoritesKey: 'fresco21_favorites_v3',

    // ========================================
    // 이미지 설정
    // ========================================
    defaultLogoPath: '/images/default-logo.jpg',
    lazyLoadThreshold: 200,  // Lazy loading 트리거 거리 (픽셀)

    // ========================================
    // 반응형 브레이크포인트
    // ========================================
    breakpoints: {
        mobile: 768,
        tablet: 992,
        desktop: 1200
    },

    // ========================================
    // 에러 메시지
    // ========================================
    errorMessages: {
        networkError: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        apiError: '데이터를 불러오는 중 오류가 발생했습니다.',
        gpsError: 'GPS 위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.',
        noResults: '검색 결과가 없습니다.',
        cacheError: '캐시 저장 중 오류가 발생했습니다.'
    },

    // ========================================
    // 유틸리티 함수
    // ========================================

    /**
     * 환경 설정 검증
     * @returns {Object} 검증 결과 { isValid, errors }
     */
    validate: function() {
        var errors = [];

        if (!this.naverMapNcpKeyId) {
            errors.push('네이버 지도 NCP Key ID가 설정되지 않았습니다.');
        }

        if (!this.googleSheetApiUrl) {
            errors.push('Google Sheets API URL이 설정되지 않았습니다.');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * 주소에서 지역 추출 (v2 extractRegion 함수 재사용)
     * @param {string} address - 주소
     * @returns {string} 지역명
     */
    extractRegion: function(address) {
        if (!address) return '기타';

        var regions = [
            '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
            '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
        ];

        for (var i = 0; i < regions.length; i++) {
            if (address.indexOf(regions[i]) !== -1) {
                return regions[i];
            }
        }

        return '기타';
    },

    /**
     * 파트너 유형에 따른 색상 반환
     * @param {string} partnerType - 파트너 유형
     * @returns {string} 색상 코드
     */
    getPartnerTypeColor: function(partnerType) {
        return this.partnerTypeColors[partnerType] || this.partnerTypeColors.default;
    },

    /**
     * 카테고리에 따른 색상 반환
     * @param {string} category - 카테고리명
     * @returns {string} 색상 코드
     */
    getCategoryColor: function(category) {
        return this.categoryColors[category] || this.categoryColors.default;
    },

    /**
     * 현재 디바이스 타입 반환
     * @returns {string} 'mobile' | 'tablet' | 'desktop'
     */
    getDeviceType: function() {
        var width = window.innerWidth;

        if (width < this.breakpoints.mobile) {
            return 'mobile';
        } else if (width < this.breakpoints.tablet) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }
};

// 전역 객체에 등록 (메이크샵 호환)
if (typeof window !== 'undefined') {
    window.PARTNERMAP_CONFIG = CONFIG;
    window.CONFIG = CONFIG;
}
/**
 * 파트너맵 v3 - API 래퍼
 * 책임: Google Sheets API 통신, 캐싱, 데이터 변환
 * v2 검증된 로직 재사용 (메이크샵은 렌더링 플랫폼만 사용)
 */

(function(window) {
    'use strict';

    /**
     * API 클라이언트
     * @param {Object} config - CONFIG 객체
     */
    function PartnerAPI(config) {
        this.config = config;
    }

    // ========================================
    // 캐시 관리 (v2 getCache/setCache 재사용)
    // ========================================

    /**
     * 캐시에서 데이터 가져오기
     * @returns {Array|null} 파트너 데이터 배열 또는 null
     */
    PartnerAPI.prototype.getCache = function() {
        try {
            var cached = localStorage.getItem(this.config.cacheKey);
            if (!cached) {
                return null;
            }

            var parsedData = JSON.parse(cached);

            // 버전 확인
            if (parsedData.version !== this.config.cacheVersion) {
                console.log('[Cache] 버전 불일치, 캐시 무효화');
                this.clearCache();
                return null;
            }

            // 만료 확인
            var now = Date.now();
            if (now - parsedData.timestamp > this.config.cacheDuration) {
                console.log('[Cache] 만료됨, 캐시 무효화');
                this.clearCache();
                return null;
            }

            // 빈 배열 확인 (v2 로직)
            if (!parsedData.data || parsedData.data.length === 0) {
                console.log('[Cache] 빈 배열, 캐시 무시');
                return null;
            }

            console.log('[Cache] 캐시 히트 (' + parsedData.data.length + '개 파트너)');
            return parsedData.data;

        } catch (error) {
            console.error('[Cache] 캐시 읽기 오류:', error);
            return null;
        }
    };

    /**
     * 캐시에 데이터 저장 (v2 setCache 재사용)
     * @param {Array} partners - 파트너 데이터 배열
     * @returns {boolean} 저장 성공 여부
     */
    PartnerAPI.prototype.setCache = function(partners) {
        try {
            var cacheData = {
                version: this.config.cacheVersion,
                timestamp: Date.now(),
                data: partners
            };

            localStorage.setItem(this.config.cacheKey, JSON.stringify(cacheData));
            console.log('[Cache] 캐시 저장 완료 (' + partners.length + '개 파트너)');
            return true;

        } catch (error) {
            console.error('[Cache] 캐시 저장 오류:', error);
            return false;
        }
    };

    /**
     * 캐시 삭제
     */
    PartnerAPI.prototype.clearCache = function() {
        try {
            localStorage.removeItem(this.config.cacheKey);
            console.log('[Cache] 캐시 삭제 완료');
        } catch (error) {
            console.error('[Cache] 캐시 삭제 오류:', error);
        }
    };

    // ========================================
    // Google Sheets API (v2 loadPartnerData 재사용)
    // ========================================

    /**
     * Google Sheets에서 파트너 데이터 로드
     * v2 main.js loadPartnerData() 함수 재사용 (508-561줄)
     * @param {boolean} forceRefresh - 강제 새로고침 여부
     * @returns {Promise<Array>} 파트너 데이터 배열
     */
    PartnerAPI.prototype.loadPartnerData = function(forceRefresh) {
        var self = this;

        // 캐시 확인 (강제 새로고침이 아닌 경우)
        if (!forceRefresh) {
            var cached = self.getCache();
            if (cached && cached.length > 0) {
                return Promise.resolve(cached);
            }
        }

        console.log('[API] 파트너 데이터 로드 시작');

        // 테스트 데이터 모드 (개발용)
        if (self.config.useTestData) {
            console.log('[API] 테스트 데이터 모드 활성화');
            return fetch(self.config.testDataPath)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('테스트 데이터 로드 실패: ' + response.status);
                    }
                    return response.json();
                })
                .then(function(rawPartners) {
                    console.log('[API] 테스트 데이터 로드 완료:', rawPartners.length + '개');
                    return self.processPartnerData(rawPartners);
                })
                .catch(function(error) {
                    console.error('[API] 테스트 데이터 로드 오류:', error);
                    return [];
                });
        }

        // 운영 모드: Google Sheets API
        return fetch(self.config.googleSheetApiUrl)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Google Sheets API 호출 실패: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('[API] 응답 수신:', data);

                // API 응답 구조 확인 (v2와 동일: data.partners 사용)
                var rawPartners = data.partners || data;

                console.log('[API] rawPartners:', rawPartners);

                if (!Array.isArray(rawPartners)) {
                    console.error('[API] 잘못된 데이터 형식:', data);
                    return [];
                }

                console.log('[API] 파트너 수:', rawPartners.length);

                // 데이터 가공 위임
                return self.processPartnerData(rawPartners);
            })
            .catch(function(error) {
                console.error('[API] 데이터 로드 실패:', error);
                return [];
            });
    };

    /**
     * 파트너 데이터 가공 (공통 로직)
     * @param {Array} rawPartners - 원본 파트너 데이터
     * @returns {Array} 가공된 파트너 데이터
     */
    PartnerAPI.prototype.processPartnerData = function(rawPartners) {
        var self = this;

        if (!Array.isArray(rawPartners)) {
            console.error('[API] 잘못된 데이터 형식:', rawPartners);
            return [];
        }

        // 데이터 가공 (v2 로직 재사용)
        var partners = rawPartners
            .filter(function(p) {
                return p.lat && p.lng;
            })
            .map(function(p, index) {
                return {
                    id: p.id || ('partner-' + index),  // [FIX] id가 없으면 자동 생성
                    name: p.name,
                    category: p.category ? p.category.split(',').map(function(c) {
                        return c.trim();
                    }) : [],
                    address: p.address,
                    latitude: parseFloat(p.lat),  // [CRITICAL] lat → latitude
                    longitude: parseFloat(p.lng),  // [CRITICAL] lng → longitude
                    phone: p.phone,
                    email: p.email,
                    description: p.description,
                    imageUrl: p.imageUrl,
                    logoUrl: p.logoUrl,
                    hours: p.hours || '',
                    link: p.link || '',
                    association: p.association || '',
                    partnerType: p.partnerType
                        ? (typeof p.partnerType === 'string'
                            ? p.partnerType.split(',').map(function(t) {
                                return t.trim();
                            })
                            : p.partnerType)
                        : []
                };
            });

        console.log('[API] 가공 완료 (' + partners.length + '개 파트너)');

        // 캐시 저장
        self.setCache(partners);

        return partners;
    };

    /**
     * 단일 파트너 조회
     * @param {string} partnerId - 파트너 ID
     * @returns {Promise<Object|null>} 파트너 데이터 또는 null
     */
    PartnerAPI.prototype.getPartner = function(partnerId) {
        var self = this;

        return self.loadPartnerData(false)
            .then(function(partners) {
                var partner = partners.find(function(p) {
                    return String(p.id) === String(partnerId);
                });

                return partner || null;
            });
    };

    // ========================================
    // 전역 등록
    // ========================================

    window.PartnerAPI = PartnerAPI;

})(window);
/**
 * 파트너맵 v3 - 지도 시스템
 * 책임: 네이버 지도 SDK, 마커 관리, 클러스터링 (O(n) 그리드 기반)
 * 메이크샵 호환: 템플릿 리터럴 이스케이프 적용
 */

(function(window) {
    'use strict';

    /**
     * 지도 서비스
     * @param {Object} config - CONFIG 객체
     */
    function MapService(config) {
        this.config = config;
        this.map = null;
        this.markers = [];  // { partner, marker } 배열
        this.clusterMarkers = [];  // 클러스터 마커 배열
        this.referencePoint = null;  // 기준점 (GPS 등)
        this.referencePointMarker = null;  // 기준점 마커 (지도 클릭 또는 GPS)
        this.isDragging = false;  // 드래그 상태 추적
    }

    // ========================================
    // SDK 로드
    // ========================================

    /**
     * 네이버 지도 SDK 로드 확인 (HTML에서 이미 로드됨)
     * @returns {Promise<void>}
     */
    MapService.prototype.loadSDK = function() {
        var self = this;

        return new Promise(function(resolve, reject) {
            // SDK가 이미 로드된 경우
            if (window.naver && window.naver.maps) {
                console.log('[Map] 네이버 지도 SDK 로드 확인');
                resolve();
                return;
            }

            // SDK 로드 대기 (최대 5초)
            console.log('[Map] 네이버 지도 SDK 로드 대기 중...');
            var checkCount = 0;
            var checkInterval = setInterval(function() {
                checkCount++;
                if (window.naver && window.naver.maps) {
                    clearInterval(checkInterval);
                    console.log('[Map] 네이버 지도 SDK 로드 완료');
                    resolve();
                } else if (checkCount > 50) {
                    clearInterval(checkInterval);
                    console.error('[Map] 네이버 지도 SDK 로드 타임아웃');
                    reject(new Error('네이버 지도 SDK 로드 실패: HTML 탭에 SDK 스크립트가 누락되었습니다.'));
                }
            }, 100);
        });
    };

    // ========================================
    // 지도 초기화
    // ========================================

    /**
     * 지도 초기화
     * @param {string} containerId - 지도 컨테이너 DOM ID
     * @returns {Object} 네이버 지도 인스턴스
     */
    MapService.prototype.init = function(containerId) {
        var self = this;

        if (!window.naver || !window.naver.maps) {
            throw new Error('네이버 지도 SDK가 로드되지 않았습니다.');
        }

        var mapOptions = {
            center: new naver.maps.LatLng(
                self.config.defaultCenter.lat,
                self.config.defaultCenter.lng
            ),
            zoom: self.config.defaultZoom,
            zoomControl: true,
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT
            },
            mapTypeControl: true
        };

        self.map = new naver.maps.Map(containerId, mapOptions);

        // 드래그 이벤트 리스너
        naver.maps.Event.addListener(self.map, 'dragstart', function() {
            self.isDragging = true;
        });

        naver.maps.Event.addListener(self.map, 'dragend', function() {
            setTimeout(function() {
                self.isDragging = false;
            }, 100);
        });

        // 지도 클릭 이벤트 (기준점 설정)
        naver.maps.Event.addListener(self.map, 'click', function(e) {
            if (self.isDragging) return;

            if (e && e.coord) {
                var lat = e.coord._lat || e.coord.y;
                var lng = e.coord._lng || e.coord.x;

                if (lat && lng) {
                    self.setReferencePointWithMarker(lat, lng);

                    // FilterService에 기준점 전달
                    if (window.FilterService) {
                        window.FilterService.setReferencePoint(lat, lng);

                        // 거리순 정렬로 자동 변경
                        var sortSelect = document.getElementById('pm-sort-select');
                        if (sortSelect) {
                            sortSelect.value = 'distance';
                            window.FilterService.applyFilters();
                        }
                    }

                    if (window.UIService) {
                        window.UIService.showToast('기준점이 설정되었습니다.', 'success');
                    }
                }
            }
        });

        // 줌/idle 이벤트 (마커 가시성 업데이트)
        naver.maps.Event.addListener(self.map, 'idle', function() {
            self.updateMarkerVisibility();
        });

        console.log('[Map] 지도 초기화 완료');
        return self.map;
    };

    // ========================================
    // 마커 생성
    // ========================================

    /**
     * 마커 생성 (기존 마커 제거 후 생성)
     * @param {Array} partners - 파트너 데이터 배열
     */
    MapService.prototype.createMarkers = function(partners) {
        var self = this;

        // 기존 마커 제거
        self.clearMarkers();

        partners.forEach(function(partner) {
            // 좌표 검증
            if (!partner.latitude || !partner.longitude) {
                console.warn('[Map] 좌표 누락:', partner.name);
                return;
            }

            var position = new naver.maps.LatLng(partner.latitude, partner.longitude);

            var marker = new naver.maps.Marker({
                position: position,
                map: null,  // 초기에는 숨김
                icon: {
                    content: self.createMarkerIcon(partner),
                    anchor: new naver.maps.Point(20, 20)
                }
            });

            // 클릭 이벤트
            naver.maps.Event.addListener(marker, 'click', function() {
                // Analytics 추적 - 지도 마커 클릭
                if (window.AnalyticsService && window.analyticsInstance) {
                    window.analyticsInstance.trackMapMarkerClick(partner.id, partner.name);
                }

                if (window.UIService && window.UIService.showPartnerDetail) {
                    window.UIService.showPartnerDetail(partner);
                }
            });

            self.markers.push({
                partner: partner,
                marker: marker
            });
        });

        console.log('[Map] 마커 생성 완료 (' + partners.length + '개)');

        // 가시성 업데이트
        self.updateMarkerVisibility();
    };

    /**
     * 마커 아이콘 HTML 생성
     * @param {Object} partner - 파트너 데이터
     * @returns {string} HTML 문자열
     */
    MapService.prototype.createMarkerIcon = function(partner) {
        var self = this;

        // 색상 결정: 파트너 유형 > 카테고리 > 기본
        var color = self.config.getPartnerTypeColor(partner.partnerType);

        // 꽃 아이콘 SVG
        var flowerIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="margin-right: 6px;">' +
            '<path d="M12 2C12 2 10.5 6 10.5 8.5C10.5 9.88 11.12 11 12 11C12.88 11 13.5 9.88 13.5 8.5C13.5 6 12 2 12 2Z"/>' +
            '<path d="M16.24 7.76C16.24 7.76 15 11.5 16 13C16.5 13.75 17.5 14 18.5 13.5C19.5 13 20 12 19.5 10.5C19 9 16.24 7.76 16.24 7.76Z"/>' +
            '<path d="M7.76 7.76C7.76 7.76 5 9 4.5 10.5C4 12 4.5 13 5.5 13.5C6.5 14 7.5 13.75 8 13C9 11.5 7.76 7.76 7.76 7.76Z"/>' +
            '<path d="M12 12C10.34 12 9 13.34 9 15C9 16.66 10.34 18 12 18C13.66 18 15 16.66 15 15C15 13.34 13.66 12 12 12Z"/>' +
            '<path d="M8.5 16.5C8.5 16.5 6.5 19 7 20.5C7.5 22 9 22 10 21C11 20 10.5 18 9.5 17C8.5 16 8.5 16.5 8.5 16.5Z"/>' +
            '<path d="M15.5 16.5C15.5 16.5 17.5 19 17 20.5C16.5 22 15 22 14 21C13 20 13.5 18 14.5 17C15.5 16 15.5 16.5 15.5 16.5Z"/>' +
            '</svg>';

        // XSS 방지: escapeHtml 사용
        var escapedName = window.escapeHtml ? window.escapeHtml(partner.name) : partner.name;

        // HTML 반환 (문자열 연결 사용 - 메이크샵 호환)
        return '<div style="' +
            'display: flex;' +
            'align-items: center;' +
            'gap: 4px;' +
            'background: white;' +
            'padding: 10px 16px;' +
            'border-radius: 9999px;' +
            'box-shadow: 0 8px 32px rgba(0,0,0,0.12);' +
            'border: 2px solid ' + color + ';' +
            'font-family: -apple-system, BlinkMacSystemFont, sans-serif;' +
            'font-size: 14px;' +
            'font-weight: 600;' +
            'color: ' + color + ';' +
            'white-space: nowrap;' +
            'transition: all 0.3s ease;' +
            'cursor: pointer;' +
            '" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 12px 40px rgba(0,0,0,0.2)\';" ' +
            'onmouseout="this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 8px 32px rgba(0,0,0,0.12)\';">' +
            flowerIcon +
            escapedName +
            '</div>';
    };

    /**
     * 클러스터 마커 아이콘 HTML 생성
     * @param {number} count - 클러스터 내 파트너 수
     * @returns {string} HTML 문자열
     */
    MapService.prototype.createClusterIcon = function(count) {
        return '<div style="' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'width: 50px;' +
            'height: 50px;' +
            'background: linear-gradient(135deg, #7D9675 0%, #5A6F52 100%);' +
            'border-radius: 50%;' +
            'box-shadow: 0 8px 24px rgba(0,0,0,0.2);' +
            'font-family: -apple-system, BlinkMacSystemFont, sans-serif;' +
            'font-size: 16px;' +
            'font-weight: 700;' +
            'color: white;' +
            'cursor: pointer;' +
            'transition: all 0.3s ease;' +
            '" onmouseover="this.style.transform=\'scale(1.1)\';" ' +
            'onmouseout="this.style.transform=\'scale(1)\';">' +
            count +
            '</div>';
    };

    // ========================================
    // 마커 가시성 & 클러스터링
    // ========================================

    /**
     * 줌/뷰포트에 따른 마커 가시성 업데이트
     */
    MapService.prototype.updateMarkerVisibility = function() {
        var self = this;

        if (!self.map) return;

        var bounds = self.map.getBounds();
        if (!bounds) return;

        var zoom = self.map.getZoom();

        // 기존 클러스터 마커 제거
        self.clusterMarkers.forEach(function(marker) {
            marker.setMap(null);
        });
        self.clusterMarkers = [];

        if (zoom <= self.config.clusterZoom) {
            // === 클러스터 모드 ===
            var visibleItems = [];

            self.markers.forEach(function(item) {
                // 개별 마커 숨김
                item.marker.setMap(null);

                // Viewport 내 마커만 수집
                if (bounds.hasLatLng(item.marker.getPosition())) {
                    visibleItems.push(item);
                }
            });

            // 그리드 기반 클러스터링 (O(n))
            var clusters = self.computeGridClusters(visibleItems, zoom);

            clusters.forEach(function(cluster) {
                if (cluster.length === 1) {
                    // 단일 마커는 그대로 표시
                    cluster[0].marker.setMap(self.map);
                } else {
                    // 클러스터 마커 생성
                    self.createClusterMarker(cluster);
                }
            });

        } else {
            // === 일반 모드: 개별 마커 표시 ===
            self.markers.forEach(function(item) {
                var inBounds = bounds.hasLatLng(item.marker.getPosition());

                if (inBounds && !item.marker.getMap()) {
                    item.marker.setMap(self.map);
                } else if (!inBounds && item.marker.getMap()) {
                    item.marker.setMap(null);
                }
            });
        }
    };

    /**
     * 그리드 기반 클러스터링 (O(n) 성능)
     * @param {Array} items - 마커 아이템 배열
     * @param {number} zoom - 현재 줌 레벨
     * @returns {Array} 클러스터 배열
     */
    MapService.prototype.computeGridClusters = function(items, zoom) {
        var self = this;

        // 줌 레벨에 따른 그리드 크기 (도 단위)
        var gridSize = Math.pow(2, 12 - zoom) * 0.01;

        var grid = {};

        items.forEach(function(item) {
            var lat = item.partner.latitude;
            var lng = item.partner.longitude;

            // 그리드 키 생성
            var gridX = Math.floor(lng / gridSize);
            var gridY = Math.floor(lat / gridSize);
            var key = gridX + '_' + gridY;

            if (!grid[key]) {
                grid[key] = [];
            }

            grid[key].push(item);
        });

        // 그리드를 배열로 변환
        var clusters = Object.values(grid);

        // 최소 클러스터 크기 필터링
        return clusters.filter(function(cluster) {
            return cluster.length >= self.config.clusterMinSize || cluster.length === 1;
        });
    };

    /**
     * 클러스터 마커 생성
     * @param {Array} cluster - 클러스터 아이템 배열
     */
    MapService.prototype.createClusterMarker = function(cluster) {
        var self = this;

        // 클러스터 중심 계산 (평균)
        var avgLat = 0;
        var avgLng = 0;

        cluster.forEach(function(item) {
            avgLat += item.partner.latitude;
            avgLng += item.partner.longitude;
        });

        avgLat /= cluster.length;
        avgLng /= cluster.length;

        var position = new naver.maps.LatLng(avgLat, avgLng);

        var marker = new naver.maps.Marker({
            position: position,
            map: self.map,
            icon: {
                content: self.createClusterIcon(cluster.length),
                anchor: new naver.maps.Point(25, 25)
            },
            zIndex: 100
        });

        // 클릭 시 줌인
        naver.maps.Event.addListener(marker, 'click', function() {
            self.map.setCenter(position);
            self.map.setZoom(self.map.getZoom() + 2);
        });

        self.clusterMarkers.push(marker);
    };

    // ========================================
    // 유틸리티
    // ========================================

    /**
     * 모든 마커 제거
     */
    MapService.prototype.clearMarkers = function() {
        var self = this;

        self.markers.forEach(function(item) {
            item.marker.setMap(null);
        });
        self.markers = [];

        self.clusterMarkers.forEach(function(marker) {
            marker.setMap(null);
        });
        self.clusterMarkers = [];
    };

    /**
     * 지도 초기화 (중심/줌 리셋)
     */
    MapService.prototype.reset = function() {
        var self = this;

        if (!self.map) return;

        self.map.setCenter(new naver.maps.LatLng(
            self.config.defaultCenter.lat,
            self.config.defaultCenter.lng
        ));
        self.map.setZoom(self.config.defaultZoom);
    };

    /**
     * 특정 파트너로 지도 이동
     * @param {Object} partner - 파트너 데이터
     */
    MapService.prototype.moveTo = function(partner) {
        var self = this;

        if (!self.map || !partner.latitude || !partner.longitude) return;

        var position = new naver.maps.LatLng(partner.latitude, partner.longitude);
        self.map.setCenter(position);
        self.map.setZoom(15);  // 상세 줌 레벨
    };

    /**
     * 기준점 설정 (GPS 등)
     * @param {number} lat - 위도
     * @param {number} lng - 경도
     */
    MapService.prototype.setReferencePoint = function(lat, lng) {
        var self = this;

        self.referencePoint = { lat: lat, lng: lng };

        if (!self.map) return;

        // SDK 로드 확인
        if (typeof naver === 'undefined' || !naver.maps) {
            console.warn('[Map] 네이버 지도 SDK가 아직 로드되지 않았습니다.');
            return;
        }

        // 기준점 마커 표시 (선택 사항)
        var position = new naver.maps.LatLng(lat, lng);
        self.map.setCenter(position);
        self.map.setZoom(self.config.gpsZoomLevel);
    };

    /**
     * 특정 좌표로 지도 이동
     * @param {number} lat - 위도
     * @param {number} lng - 경도
     * @param {number} zoom - 줌 레벨 (선택사항)
     */
    MapService.prototype.moveToLocation = function(lat, lng, zoom) {
        var self = this;

        if (!self.map) {
            console.warn('[Map] 지도가 초기화되지 않았습니다.');
            return;
        }

        // SDK 로드 확인
        if (typeof naver === 'undefined' || !naver.maps) {
            console.warn('[Map] 네이버 지도 SDK가 아직 로드되지 않았습니다.');
            return;
        }

        var position = new naver.maps.LatLng(lat, lng);
        self.map.setCenter(position);

        if (zoom) {
            self.map.setZoom(zoom);
        }

        console.log('[Map] 지도 이동:', { lat: lat, lng: lng, zoom: zoom });
    };

    /**
     * 기준점 설정 및 마커 표시 (지도 클릭용)
     * @param {number} lat - 위도
     * @param {number} lng - 경도
     */
    MapService.prototype.setReferencePointWithMarker = function(lat, lng) {
        var self = this;

        // 기존 마커 제거
        if (self.referencePointMarker) {
            self.referencePointMarker.setMap(null);
        }

        self.referencePoint = { lat: lat, lng: lng };

        if (!self.map) return;

        var position = new naver.maps.LatLng(lat, lng);

        // 기준점 마커 생성 (Phosphor Icon - 골드 테마)
        self.referencePointMarker = new naver.maps.Marker({
            position: position,
            map: self.map,
            icon: {
                content: '<div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;' +
                         'background:linear-gradient(135deg, #C9A961 0%, #B89750 100%);border-radius:50%;' +
                         'box-shadow:0 4px 16px rgba(201,169,97,0.5);border:3px solid white;' +
                         'animation:pulse 1.5s infinite;">' +
                         '<i class="ph ph-map-pin" style="font-size:28px;color:white;"></i>' +
                         '</div>',
                anchor: new naver.maps.Point(25, 50)
            },
            zIndex: 1000
        });

        self.map.setCenter(position);

        // 초기화 버튼 표시
        var clearBtn = document.getElementById('pm-clear-reference-btn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }
    };

    /**
     * 기준점 및 마커 초기화
     */
    MapService.prototype.clearReferencePoint = function() {
        var self = this;

        if (self.referencePointMarker) {
            self.referencePointMarker.setMap(null);
            self.referencePointMarker = null;
        }

        self.referencePoint = null;

        if (window.FilterService) {
            window.FilterService.setReferencePoint(null, null);
        }
    };

    /**
     * Haversine 거리 계산 (킬로미터)
     * @param {number} lat1 - 위도1
     * @param {number} lng1 - 경도1
     * @param {number} lat2 - 위도2
     * @param {number} lng2 - 경도2
     * @returns {number} 거리 (km)
     */
    MapService.prototype.calculateDistance = function(lat1, lng1, lat2, lng2) {
        var R = 6371;  // 지구 반지름 (km)

        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // ========================================
    // 전역 등록
    // ========================================

    window.MapService = MapService;

})(window);
/**
 * 파트너맵 v3 - 필터링 시스템
 * 책임: 4중 필터, 활성 배지, URL 동기화
 */

(function(window) {
    'use strict';

    /**
     * 필터 서비스
     * @param {Object} config - CONFIG 객체
     */
    function FilterService(config) {
        this.config = config;
        this.partners = [];
        this.filteredPartners = [];
        this.currentFilters = {
            category: [],  // 다중 선택 가능
            region: [],  // 다중 선택 가능하도록 배열로 변경
            association: [],  // 다중 선택 가능하도록 배열로 변경
            partnerType: [],  // 다중 선택 가능하도록 배열로 변경
            favorites: false,
            search: '',
            addressSearch: ''  // 주소 검색 기능 추가
        };
        this.referencePoint = null;  // GPS 기준점 (주소 검색 또는 GPS)
    }

    // ========================================
    // 초기화
    // ========================================

    /**
     * 필터 초기화
     * @param {Array} partners - 파트너 데이터 배열
     */
    FilterService.prototype.init = function(partners) {
        var self = this;

        self.partners = partners;
        self.filteredPartners = partners;

        // 필터 버튼 생성
        self.generateFilterButtons();

        // 이벤트 리스너 설정
        self.setupEventListeners();

        // URL 파라미터 로드
        self.loadUrlParams();

        // 모바일: 필터 탭 스와이프 제스처
        if (window.innerWidth < 768 && window.TouchService) {
            self.setupFilterSwipe();
        }

        // 초기 필터 적용 및 결과 카운트 업데이트
        self.applyFilters();

        console.log('[Filter] 필터 초기화 완료');
    };

    /**
     * 필터 버튼 생성
     */
    FilterService.prototype.generateFilterButtons = function() {
        var self = this;

        // 카테고리 추출
        var categories = self.extractUniqueValues('category');
        self.renderFilterGroup('category', categories);

        // 지역 추출
        var regions = self.extractRegions();
        self.renderFilterGroup('region', regions);

        // 협회 추출
        var associations = self.extractUniqueValues('association', true);
        self.renderFilterGroup('association', associations);

        // 파트너 유형 추출
        var partnerTypes = self.extractUniqueValues('partnerType');
        self.renderFilterGroup('partnerType', partnerTypes);
    };

    /**
     * 고유 값 추출
     * @param {string} field - 필드명
     * @param {boolean} splitComma - 쉼표로 분리 여부
     * @returns {Array} 고유 값 배열
     */
    FilterService.prototype.extractUniqueValues = function(field, splitComma) {
        var self = this;
        var values = new Set();

        self.partners.forEach(function(partner) {
            var value = partner[field];

            if (!value) return;

            if (splitComma && typeof value === 'string') {
                value.split(',').forEach(function(v) {
                    var trimmed = v.trim();
                    if (trimmed) values.add(trimmed);
                });
            } else if (Array.isArray(value)) {
                value.forEach(function(v) {
                    if (v) values.add(v);
                });
            } else {
                values.add(value);
            }
        });

        return Array.from(values).sort();
    };

    /**
     * 지역 추출 (주소에서 시/도 추출)
     * @returns {Array} 지역 배열
     */
    FilterService.prototype.extractRegions = function() {
        var self = this;
        var regions = new Set();

        self.partners.forEach(function(partner) {
            var region = self.extractRegionFromAddress(partner.address);
            if (region) regions.add(region);
        });

        return Array.from(regions).sort();
    };

    /**
     * 주소에서 시/도 추출
     * @param {string} address - 주소
     * @returns {string} 시/도
     */
    FilterService.prototype.extractRegionFromAddress = function(address) {
        if (!address) return null;

        var match = address.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
        return match ? match[1] : '기타';
    };

    /**
     * 필터 그룹 렌더링
     * @param {string} type - 필터 타입
     * @param {Array} values - 필터 값 배열
     */
    FilterService.prototype.renderFilterGroup = function(type, values) {
        var container = document.getElementById('pm-filter-' + type);
        if (!container) return;

        var html = '<button class="filter-btn active" data-filter-type="' + type + '" data-filter-value="all">전체</button>';

        values.forEach(function(value) {
            html += '<button class="filter-btn" data-filter-type="' + type + '" data-filter-value="' + value + '">' +
                    window.escapeHtml(value) +
                    '</button>';
        });

        container.innerHTML = html;
    };

    /**
     * 이벤트 리스너 설정
     */
    FilterService.prototype.setupEventListeners = function() {
        var self = this;

        // 필터 탭 전환
        var tabs = document.querySelectorAll('.pm-filter-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                var filterType = this.getAttribute('data-filter-type');

                // 탭 활성화
                tabs.forEach(function(t) { t.classList.remove('active'); });
                this.classList.add('active');

                // 즐겨찾기 탭은 특별 처리
                if (filterType === 'favorites') {
                    // 다른 필터 그룹 숨김
                    var groups = document.querySelectorAll('.pm-filter-group');
                    groups.forEach(function(g) { g.classList.remove('active'); });

                    // 즐겨찾기 필터 즉시 적용
                    self.setFilter('favorites', 'true');

                    // [OK] 필터 적용 후 UI 업데이트 트리거
                    self.applyFilters();
                    return;
                }

                // 일반 필터: 필터 그룹 표시
                var groups = document.querySelectorAll('.pm-filter-group');
                groups.forEach(function(g) { g.classList.remove('active'); });

                var targetGroup = document.getElementById('pm-filter-' + filterType);
                if (targetGroup) {
                    targetGroup.classList.add('active');
                }

                // 즐겨찾기 필터 해제
                if (self.currentFilters.favorites) {
                    self.setFilter('favorites', 'false');
                    self.applyFilters();  // [OK] 필터 해제 후 UI 업데이트
                }
            });
        });

        // 필터 버튼 클릭
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('filter-btn')) {
                var filterType = e.target.getAttribute('data-filter-type');
                var filterValue = e.target.getAttribute('data-filter-value');

                // 모든 필터: 다중 선택 (토글 방식)
                if (filterValue === 'all') {
                    // "전체" 클릭 시 모든 선택 해제
                    var parent = e.target.parentElement;
                    var siblings = parent.querySelectorAll('.filter-btn');
                    siblings.forEach(function(btn) { btn.classList.remove('active'); });
                } else {
                    // 개별 항목 클릭 시 토글
                    e.target.classList.toggle('active');
                }

                // 필터 적용
                self.setFilter(filterType, filterValue);
            }
        });

        // 활성 필터 배지 제거
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('pm-badge-remove')) {
                var filterType = e.target.getAttribute('data-filter-type');
                self.setFilter(filterType, 'all');
            }
        });

        // 정렬 변경
        var sortSelect = document.getElementById('pm-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
                self.sortPartners(this.value);
                self.applyFilters();
            });
        }

        // 주소 검색 버튼 클릭
        var addressSearchBtn = document.getElementById('pm-address-search-btn');
        var addressSearchInput = document.getElementById('pm-address-search-input');
        if (addressSearchBtn && addressSearchInput) {
            addressSearchBtn.addEventListener('click', function() {
                var address = addressSearchInput.value.trim();
                if (address) {
                    self.searchByAddress(address)
                        .then(function(result) {
                            self.showToast(result.address + ' 주변 업체를 표시합니다.', 'success');
                        })
                        .catch(function(error) {
                            console.error('[Filter] 주소 검색 오류:', error);
                        });
                } else {
                    self.showToast('주소를 입력해주세요.', 'warning');
                }
            });

            // 주소 검색 입력창에서 Enter 키
            addressSearchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addressSearchBtn.click();
                }
            });
        }
    };

    // ========================================
    // 필터 적용
    // ========================================

    /**
     * 필터 설정
     * @param {string} type - 필터 타입
     * @param {string} value - 필터 값
     */
    FilterService.prototype.setFilter = function(type, value) {
        var self = this;

        if (type === 'favorites') {
            self.currentFilters.favorites = (value === 'true' || value === true);
        } else if (type === 'search' || type === 'addressSearch') {
            // 검색: 문자열
            self.currentFilters[type] = value;
        } else {
            // 모든 필터 (카테고리, 지역, 협회, 파트너 유형): 다중 선택 (토글 방식)
            if (value === 'all') {
                // "전체" 클릭 시 모든 선택 해제
                self.currentFilters[type] = [];
            } else {
                var index = self.currentFilters[type].indexOf(value);
                if (index > -1) {
                    // 이미 선택되어 있으면 제거
                    self.currentFilters[type].splice(index, 1);
                } else {
                    // 선택되어 있지 않으면 추가
                    self.currentFilters[type].push(value);
                }
            }
        }

        // 필터 적용
        self.applyFilters();

        // Analytics 추적 - 필터 변경
        if (window.AnalyticsService && window.analyticsInstance) {
            window.analyticsInstance.trackFilterChange(type, value, self.filteredPartners.length);
        }

        // URL 동기화
        self.updateUrlParams();

        // 활성 필터 배지 업데이트
        self.updateActiveFilterBadges();
    };

    /**
     * 검색 설정
     * @param {string} query - 검색어
     */
    FilterService.prototype.setSearch = function(query) {
        var self = this;

        self.currentFilters.search = query;
        self.applyFilters();
    };

    /**
     * 필터 적용
     */
    FilterService.prototype.applyFilters = function() {
        var self = this;

        self.filteredPartners = self.partners.filter(function(partner) {
            // 카테고리 (다중 선택 - AND 조건)
            if (self.currentFilters.category.length > 0) {
                var partnerCategories = Array.isArray(partner.category) ? partner.category : [partner.category];
                // 선택된 모든 카테고리를 파트너가 가지고 있는지 확인 (AND 조건)
                var hasAllCategories = self.currentFilters.category.every(function(selectedCategory) {
                    return partnerCategories.includes(selectedCategory);
                });
                if (!hasAllCategories) {
                    return false;
                }
            }

            // 지역 (다중 선택 - OR 조건: 선택된 지역 중 하나라도 일치하면 표시)
            if (self.currentFilters.region.length > 0) {
                var partnerRegion = self.extractRegionFromAddress(partner.address);
                if (!self.currentFilters.region.includes(partnerRegion)) {
                    return false;
                }
            }

            // 협회 (다중 선택 - AND 조건)
            if (self.currentFilters.association.length > 0) {
                var partnerAssociations = partner.association
                    ? partner.association.split(',').map(function(a) { return a.trim(); })
                    : [];
                var hasAllAssociations = self.currentFilters.association.every(function(selectedAssoc) {
                    return partnerAssociations.includes(selectedAssoc);
                });
                if (!hasAllAssociations) {
                    return false;
                }
            }

            // 파트너 유형 (다중 선택 - AND 조건)
            if (self.currentFilters.partnerType.length > 0) {
                var partnerTypes = Array.isArray(partner.partnerType) ? partner.partnerType : [partner.partnerType];
                var hasAllTypes = self.currentFilters.partnerType.every(function(selectedType) {
                    return partnerTypes.includes(selectedType);
                });
                if (!hasAllTypes) {
                    return false;
                }
            }

            // 즐겨찾기
            if (self.currentFilters.favorites) {
                var favorites = JSON.parse(localStorage.getItem(self.config.favoritesKey) || '[]');
                // partnerId를 문자열로 통일 (타입 불일치 방지)
                if (!favorites.includes(String(partner.id))) {
                    return false;
                }
            }

            // 검색
            if (self.currentFilters.search) {
                var query = self.currentFilters.search.toLowerCase();
                var nameMatch = partner.name.toLowerCase().includes(query);
                var addressMatch = partner.address.toLowerCase().includes(query);
                if (!nameMatch && !addressMatch) {
                    return false;
                }
            }

            return true;
        });

        // 정렬 적용
        var sortType = document.getElementById('pm-sort-select');
        if (sortType) {
            self.sortPartners(sortType.value);
        }

        // 지도 및 리스트 업데이트
        if (window.MapService && window.MapService.createMarkers) {
            window.MapService.createMarkers(self.filteredPartners);
        }

        if (window.UIService && window.UIService.renderPartnerList) {
            window.UIService.renderPartnerList(self.filteredPartners);
        }

        // 결과 카운트 업데이트
        var resultCountElement = document.getElementById('pm-result-count-text');
        if (resultCountElement) {
            resultCountElement.textContent = '전체 ' + self.filteredPartners.length + '개 업체';
        }

        console.log('[Filter] 필터 적용 완료 (' + self.filteredPartners.length + '개 결과)');
    };

    // ========================================
    // 정렬
    // ========================================

    /**
     * 파트너 정렬
     * @param {string} sortType - 정렬 타입 ('name', 'distance', 'recent')
     */
    FilterService.prototype.sortPartners = function(sortType) {
        var self = this;

        switch (sortType) {
            case 'name':
                self.filteredPartners.sort(function(a, b) {
                    return a.name.localeCompare(b.name, 'ko');
                });
                break;

            case 'distance':
                if (self.referencePoint) {
                    // 거리 계산 및 파트너 객체에 추가
                    self.filteredPartners.forEach(function(partner) {
                        partner.distance = self.calculateDistance(
                            self.referencePoint.lat,
                            self.referencePoint.lng,
                            partner.latitude,
                            partner.longitude
                        );
                    });

                    // 정렬
                    self.filteredPartners.sort(function(a, b) {
                        return a.distance - b.distance;
                    });
                } else {
                    // 기준점이 없으면 안내 메시지
                    if (window.UIService) {
                        window.UIService.showToast(
                            '지도를 클릭하거나 GPS 버튼을 눌러 기준점을 설정하세요.',
                            'info'
                        );
                    }
                }
                break;

            case 'recent':
                // ID가 최근 추가순이라고 가정
                self.filteredPartners.sort(function(a, b) {
                    return b.id - a.id;
                });
                break;
        }
    };

    /**
     * Haversine 거리 계산 (킬로미터)
     */
    FilterService.prototype.calculateDistance = function(lat1, lng1, lat2, lng2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    /**
     * 기준점 설정 (GPS)
     * @param {number} lat - 위도
     * @param {number} lng - 경도
     */
    FilterService.prototype.setReferencePoint = function(lat, lng) {
        var self = this;
        self.referencePoint = { lat: lat, lng: lng };
    };

    /**
     * 주소 검색 (네이버 지도 SDK Geocoder - CORS 해결)
     * @param {string} address - 검색할 주소
     * @returns {Promise} 좌표 변환 결과
     */
    FilterService.prototype.searchByAddress = function(address) {
        var self = this;

        if (!address || address.trim() === '') {
            self.showToast('주소를 입력해주세요.', 'warning');
            return Promise.reject('주소가 비어있습니다.');
        }

        // 로딩 표시
        var searchBtn = document.getElementById('pm-address-search-btn');
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = '검색 중...';
        }

        console.log('[Filter] 주소 검색 시작:', address);

        // 네이버 지도 SDK 확인
        if (typeof naver === 'undefined' || !naver.maps || !naver.maps.Service) {
            self.showToast('지도 서비스를 초기화하는 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = '검색';
            }
            return Promise.reject('지도 SDK 미로드');
        }

        // Promise로 래핑 (네이버 지도 SDK Geocoder 사용 - CORS 해결)
        return new Promise(function(resolve, reject) {
            naver.maps.Service.geocode({
                query: address
            }, function(status, response) {
                // 로딩 해제
                if (searchBtn) {
                    searchBtn.disabled = false;
                    searchBtn.textContent = '검색';
                }

                if (status !== naver.maps.Service.Status.OK) {
                    console.error('[Filter] Geocoding 실패:', status);
                    self.showToast('주소를 찾을 수 없습니다. 다시 시도해주세요.', 'error');
                    reject(new Error('Geocoding 실패'));
                    return;
                }

                var result = response.v2.addresses[0];
                if (!result) {
                    console.error('[Filter] 주소 결과 없음');
                    self.showToast('주소를 찾을 수 없습니다. 다시 시도해주세요.', 'error');
                    reject(new Error('주소 결과 없음'));
                    return;
                }

                var lat = parseFloat(result.y);
                var lng = parseFloat(result.x);

                console.log('[Filter] 좌표 변환 완료:', { lat: lat, lng: lng, address: result.roadAddress || result.jibunAddress });

                // 기준점 설정
                self.setReferencePoint(lat, lng);

                // 지도 이동
                if (window.mapService) {
                    window.mapService.moveToLocation(lat, lng, 13);
                }

                // 거리순 정렬로 변경
                var sortSelect = document.getElementById('pm-sort-select');
                if (sortSelect) {
                    sortSelect.value = 'distance';
                }
                self.sortPartners('distance');

                // 필터 재적용 (거리 계산 포함)
                self.applyFilters();

                // 기준점 초기화 버튼 표시
                var clearBtn = document.getElementById('pm-clear-reference-btn');
                if (clearBtn) {
                    clearBtn.style.display = 'block';
                }

                // 성공 메시지
                var displayAddress = result.roadAddress || result.jibunAddress;
                self.showToast(displayAddress + ' 주변 업체를 표시합니다.', 'success');

                // Analytics 추적
                if (window.AnalyticsService && window.analyticsInstance) {
                    window.analyticsInstance.trackEvent('주소검색', '검색완료', address);
                }

                resolve({ lat: lat, lng: lng, address: displayAddress });
            });
        });
    };

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메시지
     * @param {string} type - 타입 (success, error, warning, info)
     */
    FilterService.prototype.showToast = function(message, type) {
        if (window.UIService && window.uiService) {
            window.uiService.showToast(message, type);
        } else {
            console.log('[Filter] Toast:', type, message);
        }
    };

    // ========================================
    // 활성 필터 배지
    // ========================================

    /**
     * 활성 필터 배지 업데이트
     */
    FilterService.prototype.updateActiveFilterBadges = function() {
        var self = this;
        var container = document.getElementById('pm-active-filters');
        if (!container) return;

        var badges = [];

        Object.keys(self.currentFilters).forEach(function(type) {
            var value = self.currentFilters[type];

            if (value !== 'all' && value !== '' && value !== false) {
                var label = self.getFilterLabel(type, value);
                badges.push({
                    type: type,
                    value: value,
                    label: label
                });
            }
        });

        if (badges.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        var html = badges.map(function(badge) {
            return '<span class="pm-active-badge">' +
                   window.escapeHtml(badge.label) +
                   '<button class="pm-badge-remove" data-filter-type="' + badge.type + '" aria-label="제거">×</button>' +
                   '</span>';
        }).join('');

        container.innerHTML = html;
        container.style.display = 'flex';
    };

    /**
     * 필터 레이블 가져오기
     * @param {string} type - 필터 타입
     * @param {string} value - 필터 값
     * @returns {string} 레이블
     */
    FilterService.prototype.getFilterLabel = function(type, value) {
        var labels = {
            category: '카테고리: ',
            region: '지역: ',
            association: '협회: ',
            partnerType: '유형: ',
            favorites: '즐겨찾기',
            search: '검색: '
        };

        if (type === 'favorites') {
            return labels[type];
        }

        return labels[type] + value;
    };

    // ========================================
    // URL 동기화
    // ========================================

    /**
     * URL 파라미터 업데이트
     */
    FilterService.prototype.updateUrlParams = function() {
        var self = this;

        var params = new URLSearchParams();

        Object.keys(self.currentFilters).forEach(function(type) {
            var value = self.currentFilters[type];
            if (value !== 'all' && value !== '' && value !== false) {
                params.set(type, value);
            }
        });

        var newUrl = window.location.pathname;
        if (params.toString()) {
            newUrl += '?' + params.toString();
        }

        window.history.replaceState({}, '', newUrl);
    };

    /**
     * URL 파라미터 로드
     */
    FilterService.prototype.loadUrlParams = function() {
        var self = this;

        var params = new URLSearchParams(window.location.search);

        params.forEach(function(value, key) {
            if (self.currentFilters.hasOwnProperty(key)) {
                self.currentFilters[key] = value === 'true' ? true : value;
            }
        });

        // UI 동기화
        Object.keys(self.currentFilters).forEach(function(type) {
            var value = self.currentFilters[type];
            if (value !== 'all' && value !== '' && value !== false) {
                var btn = document.querySelector('.filter-btn[data-filter-type="' + type + '"][data-filter-value="' + value + '"]');
                if (btn) {
                    var siblings = btn.parentElement.querySelectorAll('.filter-btn');
                    siblings.forEach(function(s) { s.classList.remove('active'); });
                    btn.classList.add('active');
                }
            }
        });
    };

    // ========================================
    // 유틸리티
    // ========================================

    /**
     * 필터 초기화
     */
    FilterService.prototype.resetFilters = function() {
        var self = this;

        self.currentFilters = {
            category: 'all',
            region: 'all',
            association: 'all',
            partnerType: 'all',
            favorites: false,
            search: ''
        };

        // UI 리셋
        var allBtns = document.querySelectorAll('.filter-btn');
        allBtns.forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter-value') === 'all') {
                btn.classList.add('active');
            }
        });

        self.applyFilters();
        self.updateUrlParams();
        self.updateActiveFilterBadges();
    };

    /**
     * 필터된 파트너 가져오기
     * @returns {Array} 필터된 파트너 배열
     */
    FilterService.prototype.getFilteredPartners = function() {
        return this.filteredPartners;
    };

    // ========================================
    // 터치 UX - 필터 탭 스와이프
    // ========================================

    /**
     * 필터 탭 스와이프 제스처 설정 (모바일)
     */
    FilterService.prototype.setupFilterSwipe = function() {
        var self = this;

        var filterTabs = document.querySelector('.pm-filter-tabs');
        if (!filterTabs) return;

        var tabs = Array.from(document.querySelectorAll('.pm-filter-tab'));
        var currentTabIndex = 0;

        // 현재 활성 탭 인덱스 찾기
        tabs.forEach(function(tab, index) {
            if (tab.classList.contains('active')) {
                currentTabIndex = index;
            }
        });

        // TouchService 인스턴스 생성
        var touchService = new window.TouchService();

        // 스와이프 이벤트 등록
        touchService.onSwipe(filterTabs, function(direction, distance) {
            if (direction === 'left' && currentTabIndex < tabs.length - 1) {
                // 왼쪽 스와이프: 다음 탭
                currentTabIndex++;
                self.activateTab(tabs[currentTabIndex]);
            } else if (direction === 'right' && currentTabIndex > 0) {
                // 오른쪽 스와이프: 이전 탭
                currentTabIndex--;
                self.activateTab(tabs[currentTabIndex]);
            }
        });

        console.log('[Filter] 필터 탭 스와이프 제스처 등록 완료');
    };

    /**
     * 탭 활성화
     * @param {HTMLElement} tab - 활성화할 탭
     */
    FilterService.prototype.activateTab = function(tab) {
        if (!tab) return;

        // 탭 클릭 이벤트 트리거
        tab.click();

        // 스크롤하여 탭 가시화
        tab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    };

    // ========================================
    // 전역 등록
    // ========================================

    window.FilterService = FilterService;

})(window);
/**
 * 파트너맵 v3 - 검색 시스템
 * 책임: Fuse.js 퍼지 검색, 자동완성
 */

(function(window) {
    'use strict';

    /**
     * 검색 서비스
     * @param {Object} config - CONFIG 객체
     */
    function SearchService(config) {
        this.config = config;
        this.partners = [];
        this.fuse = null;
        this.currentAutocompleteIndex = -1;  // [OK] 자동완성 키보드 네비게이션용
    }

    // ========================================
    // 초기화
    // ========================================

    /**
     * 검색 초기화
     * @param {Array} partners - 파트너 데이터 배열
     */
    SearchService.prototype.init = function(partners) {
        var self = this;

        self.partners = partners;

        // Fuse.js 검색 엔진 초기화
        if (typeof Fuse !== 'undefined') {
            self.fuse = new Fuse(partners, self.config.fuseOptions);
            console.log('[Search] Fuse.js 검색 초기화 완료');
        } else {
            console.warn('[Search] Fuse.js가 로드되지 않음, 기본 검색 사용');
        }

        // 이벤트 리스너 설정
        self.setupEventListeners();
    };

    /**
     * 이벤트 리스너 설정
     */
    SearchService.prototype.setupEventListeners = function() {
        var self = this;

        var searchInput = document.getElementById('pm-search-input');
        var searchBtn = document.getElementById('pm-search-btn');
        var autocomplete = document.getElementById('pm-autocomplete');

        if (!searchInput) return;

        // 입력 이벤트 (디바운스)
        var debounceTimer = null;
        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();

            clearTimeout(debounceTimer);

            if (query.length < self.config.searchMinLength) {
                self.hideAutocomplete();
                return;
            }

            debounceTimer = setTimeout(function() {
                self.showAutocomplete(query);
            }, self.config.debounceDelay);
        });

        // 검색 버튼 클릭
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                var query = searchInput.value.trim();
                if (query.length >= self.config.searchMinLength) {
                    self.performSearch(query);
                }
            });
        }

        // 키보드 네비게이션 (↑↓ 화살표, Enter, Escape)
        searchInput.addEventListener('keydown', function(e) {
            var autocompleteEl = document.getElementById('pm-autocomplete');
            var isAutocompleteVisible = autocompleteEl && autocompleteEl.style.display !== 'none';

            if (e.key === 'ArrowDown' && isAutocompleteVisible) {
                e.preventDefault();
                var items = autocompleteEl.querySelectorAll('.pm-autocomplete-item');
                if (items.length === 0) return;

                self.currentAutocompleteIndex = Math.min(
                    self.currentAutocompleteIndex + 1,
                    items.length - 1
                );
                self.highlightAutocompleteItem(items, self.currentAutocompleteIndex);
            } else if (e.key === 'ArrowUp' && isAutocompleteVisible) {
                e.preventDefault();
                var items = autocompleteEl.querySelectorAll('.pm-autocomplete-item');
                if (items.length === 0) return;

                self.currentAutocompleteIndex = Math.max(
                    self.currentAutocompleteIndex - 1,
                    -1
                );
                self.highlightAutocompleteItem(items, self.currentAutocompleteIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();

                // 자동완성이 열려있고 항목이 선택되어 있으면 해당 항목 선택
                if (isAutocompleteVisible && self.currentAutocompleteIndex >= 0) {
                    var items = autocompleteEl.querySelectorAll('.pm-autocomplete-item');
                    if (items[self.currentAutocompleteIndex]) {
                        var partnerId = items[self.currentAutocompleteIndex].getAttribute('data-partner-id');
                        self.selectAutocomplete(partnerId);
                    }
                } else {
                    // 아니면 일반 검색 실행
                    var query = searchInput.value.trim();
                    if (query.length >= self.config.searchMinLength) {
                        self.performSearch(query);
                    }
                }
            } else if (e.key === 'Escape') {
                self.hideAutocomplete();
                self.currentAutocompleteIndex = -1;
            }
        });

        // 외부 클릭 시 자동완성 닫기
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && autocomplete && !autocomplete.contains(e.target)) {
                self.hideAutocomplete();
            }
        });

        // 포커스 시 자동완성 표시
        searchInput.addEventListener('focus', function() {
            var query = searchInput.value.trim();
            if (query.length >= self.config.searchMinLength) {
                self.showAutocomplete(query);
            }
        });
    };

    // ========================================
    // 검색
    // ========================================

    /**
     * 검색 수행
     * @param {string} query - 검색어
     */
    SearchService.prototype.performSearch = function(query) {
        var self = this;

        self.hideAutocomplete();

        // 검색 결과 수 계산
        var results = self.search(query);
        var resultCount = results.length;

        // 최근 검색 기록 저장 (Phase 3)
        if (query && query.trim().length > 0) {
            self.saveSearchHistory(query.trim());
        }

        // Analytics 추적 - 검색
        if (window.AnalyticsService && window.analyticsInstance) {
            window.analyticsInstance.trackSearch(query, resultCount);
        }

        // FilterService에 검색어 전달
        if (window.FilterService && window.FilterService.setSearch) {
            window.FilterService.setSearch(query);
        }

        console.log('[Search] 검색 수행: ' + query + ' (' + resultCount + '개 결과)');
    };

    /**
     * 최근 검색 기록 저장 (Phase 3)
     * @param {string} query - 검색어
     */
    SearchService.prototype.saveSearchHistory = function(query) {
        try {
            var history = this.getSearchHistory();

            // 중복 제거 (기존에 있으면 제거)
            history = history.filter(function(item) {
                return item !== query;
            });

            // 맨 앞에 추가
            history.unshift(query);

            // 최대 10개만 저장
            if (history.length > 10) {
                history = history.slice(0, 10);
            }

            localStorage.setItem('pm_search_history', JSON.stringify(history));
        } catch (e) {
            console.warn('[Search] 검색 기록 저장 실패:', e);
        }
    };

    /**
     * 최근 검색 기록 불러오기 (Phase 3)
     * @returns {Array} 검색 기록 배열
     */
    SearchService.prototype.getSearchHistory = function() {
        try {
            var history = localStorage.getItem('pm_search_history');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.warn('[Search] 검색 기록 불러오기 실패:', e);
            return [];
        }
    };

    /**
     * 검색 기록 삭제 (Phase 3)
     */
    SearchService.prototype.clearSearchHistory = function() {
        try {
            localStorage.removeItem('pm_search_history');
        } catch (e) {
            console.warn('[Search] 검색 기록 삭제 실패:', e);
        }
    };

    /**
     * 퍼지 검색
     * @param {string} query - 검색어
     * @returns {Array} 검색 결과 배열
     */
    SearchService.prototype.search = function(query) {
        var self = this;

        if (!query || query.length < self.config.searchMinLength) {
            return [];
        }

        var results = [];

        if (self.fuse) {
            // Fuse.js 퍼지 검색
            var fuseResults = self.fuse.search(query);
            results = fuseResults.map(function(r) {
                return r.item;
            });
        } else {
            // 기본 검색 (Fallback)
            var q = query.toLowerCase();
            results = self.partners.filter(function(p) {
                return p.name.toLowerCase().includes(q) ||
                       p.address.toLowerCase().includes(q) ||
                       (p.category && p.category.toString().toLowerCase().includes(q));
            });
        }

        return results;
    };

    // ========================================
    // 자동완성
    // ========================================

    /**
     * 자동완성 표시
     * @param {string} query - 검색어
     */
    SearchService.prototype.showAutocomplete = function(query) {
        var self = this;

        // [OK] 자동완성 표시 시 인덱스 초기화
        self.currentAutocompleteIndex = -1;

        var autocomplete = document.getElementById('pm-autocomplete');
        if (!autocomplete) return;

        var results = self.search(query).slice(0, self.config.autocompleteLimit);

        if (results.length === 0) {
            self.hideAutocomplete();
            return;
        }

        var html = results.map(function(partner) {
            var escapedName = window.escapeHtml ? window.escapeHtml(partner.name) : partner.name;
            var escapedAddress = window.escapeHtml ? window.escapeHtml(partner.address) : partner.address;

            // 주소 자르기
            var shortAddress = escapedAddress.length > 30 ? escapedAddress.substring(0, 30) + '...' : escapedAddress;

            return '<li class="pm-autocomplete-item" data-partner-id="' + partner.id + '">' +
                   '<span class="pm-autocomplete-name">' + escapedName + '</span>' +
                   '<span class="pm-autocomplete-address">' + shortAddress + '</span>' +
                   '</li>';
        }).join('');

        autocomplete.innerHTML = '<ul class="pm-autocomplete-list">' + html + '</ul>';
        autocomplete.style.display = 'block';

        // 클릭 이벤트
        var items = autocomplete.querySelectorAll('.pm-autocomplete-item');
        items.forEach(function(item) {
            item.addEventListener('click', function() {
                var partnerId = this.getAttribute('data-partner-id');
                self.selectAutocomplete(partnerId);
            });
        });
    };

    /**
     * 자동완성 숨김
     */
    SearchService.prototype.hideAutocomplete = function() {
        var autocomplete = document.getElementById('pm-autocomplete');
        if (autocomplete) {
            autocomplete.style.display = 'none';
            autocomplete.innerHTML = '';
        }
    };

    /**
     * 자동완성 항목 하이라이트
     * @param {NodeList} items - 자동완성 항목들
     * @param {number} index - 선택된 인덱스
     */
    SearchService.prototype.highlightAutocompleteItem = function(items, index) {
        items.forEach(function(item, i) {
            if (i === index) {
                item.classList.add('pm-autocomplete-highlighted');
                // 선택된 항목이 보이도록 스크롤
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('pm-autocomplete-highlighted');
            }
        });
    };

    /**
     * 자동완성 선택
     * @param {string} partnerId - 파트너 ID
     */
    SearchService.prototype.selectAutocomplete = function(partnerId) {
        var self = this;

        var partner = self.partners.find(function(p) {
            return p.id == partnerId;
        });

        if (!partner) return;

        // 검색창에 이름 채우기
        var searchInput = document.getElementById('pm-search-input');
        if (searchInput) {
            searchInput.value = partner.name;
        }

        // 자동완성 닫기
        self.hideAutocomplete();

        // 파트너 상세 모달 표시
        if (window.UIService && window.UIService.showPartnerDetail) {
            window.UIService.showPartnerDetail(partner);
        }

        // 지도 이동
        if (window.MapService && window.MapService.moveTo) {
            window.MapService.moveTo(partner);
        }

        console.log('[Search] 자동완성 선택: ' + partner.name);
    };

    // ========================================
    // 유틸리티
    // ========================================

    /**
     * 검색어 초기화
     */
    SearchService.prototype.clearSearch = function() {
        var searchInput = document.getElementById('pm-search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        this.hideAutocomplete();

        if (window.FilterService && window.FilterService.setSearch) {
            window.FilterService.setSearch('');
        }
    };

    /**
     * 검색어 가져오기
     * @returns {string} 현재 검색어
     */
    SearchService.prototype.getQuery = function() {
        var searchInput = document.getElementById('pm-search-input');
        return searchInput ? searchInput.value.trim() : '';
    };

    // ========================================
    // 전역 등록
    // ========================================

    window.SearchService = SearchService;

})(window);
/**
 * 파트너맵 v3 - UI 컴포넌트 (Part 1/2)
 * 책임: 토스트, 모달, 파트너 카드, 즐겨찾기, 공유
 */

(function(window) {
    'use strict';

    /**
     * UI 서비스
     * @param {Object} config - CONFIG 객체
     */
    function UIService(config) {
        this.config = config;
        this.partners = [];
        this.virtualScroll = null; // Virtual Scroll 인스턴스
    }

    // ========================================
    // 초기화
    // ========================================

    /**
     * UI 초기화
     */
    UIService.prototype.init = function() {
        var self = this;

        // 모달 닫기 버튼
        var modalClose = document.getElementById('pm-modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', function() {
                self.closeModal();
            });
        }

        // 모달 오버레이 클릭
        var modalOverlay = document.querySelector('#pm-modal .pm-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function() {
                self.closeModal();
            });
        }

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                self.closeModal();
                self.closeShareModal();
            }
        });

        // 지도 리셋 버튼
        var resetMapBtn = document.getElementById('pm-reset-map-btn');
        if (resetMapBtn) {
            resetMapBtn.addEventListener('click', function() {
                if (window.MapService && window.MapService.reset) {
                    window.MapService.reset();
                    self.showToast('지도가 초기화되었습니다.', 'success');
                }
            });
        }

        // 이벤트 위임: 즐겨찾기 버튼
        document.addEventListener('click', function(e) {
            // 즐겨찾기 버튼 클릭
            var favoriteBtn = e.target.closest('.pm-favorite-btn');
            if (favoriteBtn) {
                e.stopPropagation();
                e.preventDefault();
                var partnerId = favoriteBtn.getAttribute('data-partner-id');
                if (partnerId) {
                    self.toggleFavorite(partnerId, favoriteBtn);
                }
                return;
            }

            // 공유 버튼 클릭
            var shareBtn = e.target.closest('.pm-share-btn');
            if (shareBtn) {
                e.stopPropagation();
                var partnerId = shareBtn.getAttribute('data-partner-id');
                if (partnerId) {
                    self.showShareModal(partnerId);
                }
                return;
            }
        });

        console.log('[UI] UI 초기화 완료');
    };

    // ========================================
    // 로딩
    // ========================================

    /**
     * 로딩 표시
     */
    UIService.prototype.showLoading = function() {
        var loading = document.getElementById('pm-loading-overlay');
        if (loading) {
            loading.style.display = 'flex';
        }
    };

    /**
     * 로딩 숨김
     */
    UIService.prototype.hideLoading = function() {
        var loading = document.getElementById('pm-loading-overlay');
        if (loading) {
            loading.style.display = 'none';
        }
    };

    // ========================================
    // 토스트 알림
    // ========================================

    /**
     * 토스트 알림 표시
     * @param {string} message - 메시지
     * @param {string} type - 타입 ('success', 'error', 'warning', 'info')
     */
    UIService.prototype.showToast = function(message, type) {
        var self = this;
        var container = document.getElementById('pm-toast-container');
        if (!container) return;

        type = type || 'info';

        // createElement 대신 innerHTML 사용 (메이크샵 호환)
        var toastHTML = '<div class="pm-toast pm-toast-' + type + '">' +
                        (window.escapeHtml ? window.escapeHtml(message) : message) +
                        '</div>';
        container.insertAdjacentHTML('beforeend', toastHTML);

        var toast = container.lastElementChild;

        // 애니메이션
        setTimeout(function() {
            toast.classList.add('pm-toast-show');
        }, 10);

        // 자동 제거
        setTimeout(function() {
            toast.classList.remove('pm-toast-show');
            setTimeout(function() {
                container.removeChild(toast);
            }, 300);
        }, self.config.toastDuration);
    };

    // ========================================
    // 파트너 리스트
    // ========================================

    /**
     * Skeleton Loading 표시
     * @param {number} count - 스켈레톤 카드 개수 (기본값: 5)
     */
    UIService.prototype.showSkeletonList = function(count) {
        count = count || 5;
        var listContainer = document.getElementById('pm-partner-list');
        if (!listContainer) return;

        var skeletonHTML = '';
        for (var i = 0; i < count; i++) {
            skeletonHTML += '<div class="pm-skeleton-card">' +
                '<div style="display: flex; gap: 16px;">' +
                '<div class="pm-skeleton pm-skeleton-logo"></div>' +
                '<div style="flex: 1;">' +
                '<div class="pm-skeleton pm-skeleton-text-lg"></div>' +
                '<div class="pm-skeleton pm-skeleton-text"></div>' +
                '<div class="pm-skeleton pm-skeleton-text-sm"></div>' +
                '</div>' +
                '</div>' +
                '</div>';
        }

        listContainer.innerHTML = skeletonHTML;
    };

    /**
     * Skeleton Loading 숨김
     */
    UIService.prototype.hideSkeletonList = function() {
        var listContainer = document.getElementById('pm-partner-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
    };

    /**
     * 파트너 리스트 렌더링 (Virtual Scroll 지원)
     * @param {Array} partners - 파트너 배열
     */
    UIService.prototype.renderPartnerList = function(partners) {
        var self = this;
        self.partners = partners;

        var listContainer = document.getElementById('pm-partner-list');
        if (!listContainer) return;

        if (partners.length === 0) {
            // Empty State 렌더링
            var emptyHtml = '<div class="pm-empty-state">' +
                '<i class="ph ph-magnifying-glass pm-empty-icon" aria-hidden="true"></i>' +
                '<h3>검색 결과가 없습니다</h3>' +
                '<p>다른 필터를 선택하거나 검색어를 변경해보세요.</p>' +
                '<button class="pm-empty-reset-btn" id="pm-empty-reset">필터 초기화</button>' +
                '</div>';

            // 가까운 파트너 추천 (전체 파트너 중 거리순 3개)
            var allPartners = window.FilterService ? window.FilterService.partners : [];
            var refPoint = window.FilterService ? window.FilterService.referencePoint : null;

            if (allPartners.length > 0 && refPoint) {
                var sorted = allPartners.slice().map(function(p) {
                    var dist = self.calculateDistanceSimple(refPoint.lat, refPoint.lng, p.latitude, p.longitude);
                    return { partner: p, distance: dist };
                }).sort(function(a, b) {
                    return a.distance - b.distance;
                }).slice(0, 3);

                emptyHtml += '<div class="pm-nearby-suggest">' +
                    '<h4><i class="ph ph-map-pin-area" aria-hidden="true"></i> 가까운 파트너 추천</h4>' +
                    '<div class="pm-nearby-cards">';

                for (var si = 0; si < sorted.length; si++) {
                    var sp = sorted[si].partner;
                    var sdist = sorted[si].distance;
                    var spName = window.escapeHtml(sp.name);
                    var spAddr = window.escapeHtml(sp.address);
                    var spLogo = sp.logoUrl || sp.imageUrl || self.config.defaultLogoPath;

                    emptyHtml += '<div class="pm-nearby-card" data-partner-id="' + String(sp.id) + '">' +
                        '<img src="' + spLogo + '" alt="' + spName + '" loading="lazy" ' +
                        'onerror="this.onerror=null;this.style.display=\'none\'">' +
                        '<div class="pm-nearby-info">' +
                        '<strong>' + spName + '</strong>' +
                        '<span class="pm-nearby-dist"><i class="ph ph-ruler"></i> ' + sdist.toFixed(1) + 'km</span>' +
                        '<span class="pm-nearby-addr">' + spAddr + '</span>' +
                        '</div>' +
                        '</div>';
                }

                emptyHtml += '</div></div>';
            }

            listContainer.innerHTML = emptyHtml;

            // 필터 초기화 버튼 이벤트
            var resetBtn = document.getElementById('pm-empty-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', function() {
                    if (window.FilterService) {
                        window.FilterService.resetFilters();
                    }
                });
            }

            // 추천 카드 클릭 → 상세 모달
            var nearbyCards = listContainer.querySelectorAll('.pm-nearby-card');
            for (var nc = 0; nc < nearbyCards.length; nc++) {
                nearbyCards[nc].addEventListener('click', function() {
                    var pid = this.getAttribute('data-partner-id');
                    var found = allPartners.find(function(p) {
                        return String(p.id) === pid;
                    });
                    if (found) {
                        self.showPartnerDetail(found);
                    }
                });
            }

            // Virtual Scroll 해제
            if (self.virtualScroll) {
                self.virtualScroll.destroy();
                self.virtualScroll = null;
            }
            return;
        }

        // Virtual Scroll 활성화 여부 (30개 이상일 때만)
        var useVirtualScroll = partners.length >= 30 && window.VirtualScrollService;

        if (useVirtualScroll) {
            // Virtual Scroll 사용
            self.renderWithVirtualScroll(partners, listContainer);
        } else {
            // 일반 렌더링 (30개 미만)
            self.renderWithoutVirtualScroll(partners, listContainer);
        }

        console.log('[UI] 파트너 리스트 렌더링 완료 (' + partners.length + '개, VirtualScroll: ' + useVirtualScroll + ')');
    };

    /**
     * Virtual Scroll을 사용한 렌더링
     * @param {Array} partners - 파트너 배열
     * @param {HTMLElement} listContainer - 리스트 컨테이너
     */
    UIService.prototype.renderWithVirtualScroll = function(partners, listContainer) {
        var self = this;

        // 기존 Virtual Scroll 해제
        if (self.virtualScroll) {
            self.virtualScroll.destroy();
        }

        // 컨테이너 초기화
        listContainer.innerHTML = '';

        // Virtual Scroll 생성
        self.virtualScroll = new window.VirtualScrollService(self.config);

        // 카드 클릭 콜백
        self.virtualScroll.onCardClick = function(partner) {
            self.showPartnerDetail(partner);

            // 지도 이동
            if (window.MapService && window.MapService.moveTo) {
                window.MapService.moveTo(partner);
            }
        };

        // Virtual Scroll 초기화
        self.virtualScroll.init(
            listContainer,
            partners,
            function(partner) {
                return self.createPartnerCardHTML(partner);
            }
        );
    };

    /**
     * Virtual Scroll 없이 일반 렌더링
     * @param {Array} partners - 파트너 배열
     * @param {HTMLElement} listContainer - 리스트 컨테이너
     */
    UIService.prototype.renderWithoutVirtualScroll = function(partners, listContainer) {
        var self = this;

        var html = partners.map(function(partner) {
            return self.createPartnerCardHTML(partner);
        }).join('');

        listContainer.innerHTML = html;

        // 카드 클릭 이벤트
        var cards = listContainer.querySelectorAll('.pm-partner-card');
        cards.forEach(function(card) {
            card.addEventListener('click', function(e) {
                // 즐겨찾기 버튼 클릭은 제외
                if (e.target.classList.contains('pm-favorite-btn') ||
                    e.target.closest('.pm-favorite-btn')) {
                    return;
                }

                // 공유 버튼 클릭은 제외
                if (e.target.classList.contains('pm-share-btn') ||
                    e.target.closest('.pm-share-btn')) {
                    return;
                }

                var partnerId = this.getAttribute('data-partner-id');
                var partner = partners.find(function(p) {
                    return p.id == partnerId;
                });

                if (partner) {
                    self.showPartnerDetail(partner);

                    // 지도 이동
                    if (window.MapService && window.MapService.moveTo) {
                        window.MapService.moveTo(partner);
                    }
                }
            });
        });

        // 카드 Slide In 애니메이션 (Intersection Observer)
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('pm-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            cards.forEach(function(card) {
                observer.observe(card);
            });
        } else {
            // Intersection Observer 미지원 브라우저: 즉시 표시
            cards.forEach(function(card) {
                card.classList.add('pm-visible');
            });
        }
    };

    /**
     * 파트너 카드 HTML 생성
     * @param {Object} partner - 파트너 데이터
     * @returns {string} HTML 문자열
     */
    UIService.prototype.createPartnerCardHTML = function(partner) {
        var self = this;

        // partnerId를 문자열로 통일
        var partnerId = String(partner.id);

        var isFavorite = self.isFavorite(partnerId);
        var favoriteIconClass = isFavorite ? 'ph-fill ph-heart' : 'ph-heart';
        var favoriteIcon = '<i class="ph ' + favoriteIconClass + '"></i>';
        var favoriteClass = isFavorite ? 'active' : '';

        var logoUrl = partner.logoUrl || partner.imageUrl || self.config.defaultLogoPath;
        var escapedName = window.escapeHtml(partner.name);
        var escapedAddress = window.escapeHtml(partner.address);
        var escapedPhone = window.escapeHtml(partner.phone || '-');

        // 카테고리 태그 (최대 3개까지만 표시)
        var categories = Array.isArray(partner.category) ? partner.category : [partner.category];
        var displayCategories = categories.slice(0, 3);
        var extraCount = categories.length - 3;

        var categoryTags = displayCategories.map(function(cat) {
            return '<span class="pm-category-tag">' + window.escapeHtml(cat) + '</span>';
        }).join('');

        if (extraCount > 0) {
            categoryTags += '<span class="pm-category-tag pm-category-extra">+' + extraCount + '</span>';
        }

        // 거리 표시 (있는 경우)
        var distanceHtml = '';
        if (partner.distance !== undefined) {
            distanceHtml = '<span class="pm-distance-badge"><i class="ph ph-ruler"></i> ' + partner.distance.toFixed(1) + 'km</span>';
        }

        return '<div class="pm-partner-card pm-visible" data-partner-id="' + partnerId + '" role="article" aria-label="' + escapedName + ' 업체 정보">' +
               '<button class="pm-favorite-btn ' + favoriteClass + '" ' +
               'data-partner-id="' + partnerId + '" ' +
               'title="즐겨찾기" ' +
               'aria-label="' + escapedName + ' ' + (isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가') + '">' +
               favoriteIcon +
               '</button>' +
               (distanceHtml ? '<div class="pm-distance-indicator">' + distanceHtml + '</div>' : '') +
               '<div class="pm-partner-logo">' +
               '<img src="' + logoUrl + '" ' +
               'alt="' + escapedName + '" ' +
               'loading="lazy" ' +
               'onerror="this.onerror=null;this.style.display=\&apos;none\&apos;">' +
               '</div>' +
               '<div class="pm-partner-info">' +
               '<h4>' + escapedName + '</h4>' +
               '<div class="pm-partner-categories">' + categoryTags + '</div>' +
               '<p class="pm-partner-address"><i class="ph ph-map-pin"></i> ' + escapedAddress + '</p>' +
               '<p class="pm-partner-phone"><i class="ph ph-phone"></i> ' + escapedPhone + '</p>' +
               '</div>' +
               '</div>';
    };

    // ========================================
    // 모달
    // ========================================

    /**
     * 파트너 상세 모달 표시
     * @param {Object} partner - 파트너 데이터
     */
    UIService.prototype.showPartnerDetail = function(partner) {
        var self = this;

        var modal = document.getElementById('pm-modal');
        var modalBody = document.getElementById('pm-modal-body');
        if (!modal || !modalBody) return;

        // partnerId를 문자열로 통일
        var partnerId = String(partner.id);

        // Analytics 추적 - 파트너 상세 조회
        if (window.AnalyticsService && window.analyticsInstance) {
            window.analyticsInstance.trackPartnerView(partner);
        }

        var isFavorite = self.isFavorite(partnerId);
        var favoriteIconClass = isFavorite ? 'ph-fill ph-heart' : 'ph-heart';
        var favoriteIcon = '<i class="ph ' + favoriteIconClass + '"></i>';
        var favoriteText = isFavorite ? '즐겨찾기됨' : '즐겨찾기';
        var favoriteClass = isFavorite ? 'active' : '';

        var logoUrl = partner.logoUrl || partner.imageUrl || self.config.defaultLogoPath;
        var escapedName = window.escapeHtml(partner.name);
        var escapedAddress = window.escapeHtml(partner.address);
        var escapedPhone = window.escapeHtml(partner.phone || '-');
        var escapedEmail = partner.email ? window.escapeHtml(partner.email) : '';
        var escapedDescription = partner.description ? window.escapeHtml(partner.description) : '소개 정보가 없습니다.';
        var escapedHours = partner.hours ? window.escapeHtml(partner.hours) : '';

        // 링크 필드에서 homepage/instagram 추출
        var linkText = partner.link || '';
        var homepage = '';
        var instagram = '';
        if (linkText) {
            var linkParts = linkText.split(/[,\s]+/);
            for (var li = 0; li < linkParts.length; li++) {
                var part = linkParts[li].trim();
                if (!part) continue;
                if (part.indexOf('instagram.com') !== -1 || part.indexOf('instagr.am') !== -1) {
                    instagram = part.startsWith('http') ? part : 'https://' + part;
                } else if (part.startsWith('http') || part.startsWith('www.')) {
                    homepage = part.startsWith('http') ? part : 'https://' + part;
                } else if (part.startsWith('@')) {
                    instagram = 'https://instagram.com/' + part.replace('@', '');
                }
            }
        }

        // 모바일 여부 판별
        var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // 카테고리 태그 (모달에서는 전체 표시)
        var categories = Array.isArray(partner.category) ? partner.category : [partner.category];
        var categoryTags = categories.map(function(cat) {
            return '<span class="pm-category-tag">' + window.escapeHtml(cat) + '</span>';
        }).join('');

        var html = '<div class="pm-modal-header">' +
                   '<img src="' + logoUrl + '" ' +
                   'alt="' + escapedName + '" ' +
                   'loading="lazy" ' +
                   'onerror="this.onerror=null;this.style.display=\&apos;none\&apos;">' +
                   '<h2 id="pm-modal-title">' + escapedName + '</h2>' +
                   (categoryTags ? '<div class="pm-partner-categories">' + categoryTags + '</div>' : '') +
                   '</div>' +
                   '<div class="pm-modal-actions">' +
                   '<button class="pm-action-btn pm-favorite-btn ' + favoriteClass + '" ' +
                   'data-partner-id="' + partnerId + '" ' +
                   'aria-label="' + favoriteText + '">' +
                   favoriteIcon + ' ' + favoriteText +
                   '</button>' +
                   '<button class="pm-action-btn pm-share-btn" ' +
                   'data-partner-id="' + partnerId + '" ' +
                   'aria-label="' + escapedName + ' 공유하기">' +
                   '<i class="ph ph-share-network"></i> 공유하기' +
                   '</button>' +
                   '</div>' +
                   '<div class="pm-modal-section">' +
                   '<h3>소개</h3>' +
                   '<p>' + escapedDescription + '</p>' +
                   '</div>' +
                   '<div class="pm-modal-section">' +
                   '<h3>위치 정보</h3>' +
                   '<p class="pm-address"><i class="ph ph-map-pin"></i> ' + escapedAddress + '</p>' +
                   '<div class="pm-navigation-buttons">';

        // 모바일: 앱 딥링크 + 웹 폴백 / PC: 웹 링크
        if (isMobile && partner.latitude && partner.longitude) {
            var naverDeepLink = 'nmap://route/public?dlat=' + partner.latitude +
                '&dlng=' + partner.longitude +
                '&dname=' + encodeURIComponent(partner.name) +
                '&appname=com.pressco21';
            var naverWebFallback = 'https://map.naver.com/v5/search/' + encodeURIComponent(partner.address);
            var kakaoDeepLink = 'kakaomap://route?ep=' + partner.latitude + ',' + partner.longitude + '&by=CAR';
            var kakaoWebFallback = 'https://map.kakao.com/?q=' + encodeURIComponent(partner.address);

            html += '<a href="#" class="pm-nav-btn pm-nav-naver" ' +
                    'data-deeplink="' + window.escapeHtml(naverDeepLink) + '" ' +
                    'data-fallback="' + window.escapeHtml(naverWebFallback) + '" ' +
                    'role="button" ' +
                    'aria-label="네이버 지도에서 ' + escapedName + ' 길찾기">' +
                    '<i class="ph ph-map-trifold"></i> 네이버 지도</a>' +
                    '<a href="#" class="pm-nav-btn pm-nav-kakao" ' +
                    'data-deeplink="' + window.escapeHtml(kakaoDeepLink) + '" ' +
                    'data-fallback="' + window.escapeHtml(kakaoWebFallback) + '" ' +
                    'role="button" ' +
                    'aria-label="카카오맵에서 ' + escapedName + ' 길찾기">' +
                    '<i class="ph ph-map-trifold"></i> 카카오맵</a>';
        } else {
            html += '<a href="https://map.naver.com/v5/search/' + encodeURIComponent(partner.address) + '" ' +
                    'target="_blank" rel="noopener noreferrer" ' +
                    'class="pm-nav-btn pm-nav-naver" ' +
                    'aria-label="네이버 지도에서 ' + escapedName + ' 위치 보기">' +
                    '<i class="ph ph-map-trifold"></i> 네이버 지도</a>' +
                    '<a href="https://map.kakao.com/?q=' + encodeURIComponent(partner.address) + '" ' +
                    'target="_blank" rel="noopener noreferrer" ' +
                    'class="pm-nav-btn pm-nav-kakao" ' +
                    'aria-label="카카오맵에서 ' + escapedName + ' 위치 보기">' +
                    '<i class="ph ph-map-trifold"></i> 카카오맵</a>';
        }

        html += '</div>' +
                   '</div>';

        // 영업시간 섹션
        if (escapedHours) {
            html += '<div class="pm-modal-section">' +
                    '<h3><i class="ph ph-clock"></i> 영업시간</h3>' +
                    '<p class="pm-hours-text">' + escapedHours + '</p>' +
                    '</div>';
        }

        html += '<div class="pm-modal-section">' +
                   '<h3>연락처</h3>' +
                   '<p><i class="ph ph-phone"></i> <a href="tel:' + partner.phone + '">' + escapedPhone + '</a></p>' +
                   (escapedEmail ? '<p><i class="ph ph-envelope-simple"></i> <a href="mailto:' + partner.email + '">' + escapedEmail + '</a></p>' : '') +
                   '</div>';

        // 홈페이지, 인스타그램 (link 필드에서 추출)
        if (homepage || instagram) {
            html += '<div class="pm-modal-section">' +
                    '<h3>링크</h3>';

            if (homepage) {
                html += '<p><i class="ph ph-globe"></i> <a href="' + window.escapeHtml(homepage) + '" target="_blank" rel="noopener noreferrer">홈페이지</a></p>';
            }

            if (instagram) {
                html += '<p><i class="ph ph-instagram-logo"></i> <a href="' + window.escapeHtml(instagram) + '" target="_blank" rel="noopener noreferrer">인스타그램</a></p>';
            }

            html += '</div>';
        } else if (linkText) {
            // homepage/instagram으로 분류되지 않은 일반 링크
            var safeLink = linkText.startsWith('http') ? linkText : 'https://' + linkText;
            html += '<div class="pm-modal-section">' +
                    '<h3>링크</h3>' +
                    '<p><i class="ph ph-globe"></i> <a href="' + window.escapeHtml(safeLink) + '" target="_blank" rel="noopener noreferrer">' + window.escapeHtml(linkText) + '</a></p>' +
                    '</div>';
        }

        modalBody.innerHTML = html;

        // 모바일 딥링크 클릭 핸들러 (이벤트 위임)
        if (isMobile) {
            var navButtons = modalBody.querySelectorAll('.pm-nav-btn[data-deeplink]');
            for (var ni = 0; ni < navButtons.length; ni++) {
                navButtons[ni].addEventListener('click', function(e) {
                    e.preventDefault();
                    var deeplink = this.getAttribute('data-deeplink');
                    var fallback = this.getAttribute('data-fallback');
                    var timer = setTimeout(function() {
                        window.location.href = fallback;
                    }, 1500);
                    window.location.href = deeplink;
                    // 앱이 열리면 페이지를 떠나므로 타이머가 자동 해제됨
                    window.addEventListener('pagehide', function() {
                        clearTimeout(timer);
                    }, { once: true });
                });
            }
        }

        modal.classList.add('pm-modal-active');
        document.body.style.overflow = 'hidden';

        // 모바일: 모달 스와이프 닫기 제스처
        if (window.innerWidth < 768 && window.TouchService) {
            self.setupModalSwipe(modal);
        }
    };

    /**
     * 모달 닫기
     */
    UIService.prototype.closeModal = function() {
        var modal = document.getElementById('pm-modal');
        if (modal) {
            modal.classList.remove('pm-modal-active');
            document.body.style.overflow = '';
        }
    };

    /**
     * 간단 거리 계산 (Haversine)
     * @param {number} lat1 - 위도1
     * @param {number} lng1 - 경도1
     * @param {number} lat2 - 위도2
     * @param {number} lng2 - 경도2
     * @returns {number} 거리 (km)
     */
    UIService.prototype.calculateDistanceSimple = function(lat1, lng1, lat2, lng2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    /**
     * 모달 스와이프 닫기 제스처 설정 (모바일)
     * @param {HTMLElement} modal - 모달 요소
     */
    UIService.prototype.setupModalSwipe = function(modal) {
        var self = this;

        if (!modal) return;

        var modalContent = modal.querySelector('.pm-modal-content');
        if (!modalContent) return;

        // TouchService 인스턴스 생성
        var touchService = new window.TouchService();

        // 스와이프 이벤트 등록
        touchService.onSwipe(modalContent, function(direction, distance) {
            if (direction === 'down' && distance > 80) {
                // 아래로 스와이프: 모달 닫기
                self.closeModal();
            }
        });

        console.log('[UI] 모달 스와이프 제스처 등록 완료');
    };

    // ========================================
    // 즐겨찾기
    // ========================================

    /**
     * 즐겨찾기 토글
     * @param {string} partnerId - 파트너 ID
     * @param {Event} event - 이벤트 (선택)
     */
    UIService.prototype.toggleFavorite = function(partnerId, buttonElement) {
        var self = this;

        // partnerId를 문자열로 통일 (타입 불일치 방지)
        partnerId = String(partnerId);

        var favorites = self.getFavorites();
        var index = favorites.indexOf(partnerId);

        // 파트너 정보 가져오기 (Analytics용)
        var partnerName = '';
        if (self.partners && self.partners.length > 0) {
            var partner = self.partners.find(function(p) {
                return String(p.id) === partnerId;
            });
            if (partner) {
                partnerName = partner.name;
            }
        }

        if (index === -1) {
            // 추가
            favorites.push(partnerId);
            self.showToast('즐겨찾기에 추가되었습니다.', 'success');

            // Analytics 추적
            if (window.AnalyticsService && window.analyticsInstance) {
                window.analyticsInstance.trackFavoriteAdd(partnerId, partnerName);
            }
        } else {
            // 제거
            favorites.splice(index, 1);
            self.showToast('즐겨찾기에서 제거되었습니다.', 'info');

            // Analytics 추적
            if (window.AnalyticsService && window.analyticsInstance) {
                window.analyticsInstance.trackFavoriteRemove(partnerId, partnerName);
            }
        }

        self.saveFavorites(favorites);
        self.updateFavoriteButtons();

        // 하트 Bounce 애니메이션
        var btn = buttonElement || document.querySelector('.pm-favorite-btn[data-partner-id="' + partnerId + '"]');
        if (btn) {
            btn.classList.add('pm-bouncing');
            setTimeout(function() {
                btn.classList.remove('pm-bouncing');
            }, 500);
        }
    };

    /**
     * 즐겨찾기 여부 확인
     * @param {string} partnerId - 파트너 ID
     * @returns {boolean}
     */
    UIService.prototype.isFavorite = function(partnerId) {
        // partnerId를 문자열로 통일 (타입 불일치 방지)
        partnerId = String(partnerId);
        var favorites = this.getFavorites();
        return favorites.includes(partnerId);
    };

    /**
     * 즐겨찾기 목록 가져오기
     * @returns {Array} 파트너 ID 배열
     */
    UIService.prototype.getFavorites = function() {
        var self = this;
        try {
            var favorites = localStorage.getItem(self.config.favoritesKey);
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            console.error('[UI] 즐겨찾기 로드 오류:', error);
            return [];
        }
    };

    /**
     * 즐겨찾기 목록 저장
     * @param {Array} favorites - 파트너 ID 배열
     */
    UIService.prototype.saveFavorites = function(favorites) {
        var self = this;
        try {
            localStorage.setItem(self.config.favoritesKey, JSON.stringify(favorites));
        } catch (error) {
            console.error('[UI] 즐겨찾기 저장 오류:', error);
        }
    };

    /**
     * 즐겨찾기 버튼 업데이트
     */
    UIService.prototype.updateFavoriteButtons = function() {
        var self = this;

        var buttons = document.querySelectorAll('.pm-favorite-btn');
        buttons.forEach(function(btn) {
            var partnerId = btn.getAttribute('data-partner-id');
            if (!partnerId) return; // partnerId가 없으면 스킵

            var isFav = self.isFavorite(partnerId);

            if (isFav) {
                btn.classList.add('active');
                var text = btn.textContent.includes('즐겨찾기됨') ? '<i class="ph ph-fill ph-heart"></i> 즐겨찾기됨' : '<i class="ph ph-fill ph-heart"></i>';
                btn.innerHTML = text;
            } else {
                btn.classList.remove('active');
                var text = btn.textContent.includes('즐겨찾기') ? '<i class="ph ph-heart"></i> 즐겨찾기' : '<i class="ph ph-heart"></i>';
                btn.innerHTML = text;
            }
        });
    };

    // ========================================
    // 공유
    // ========================================

    /**
     * 공유 모달 표시
     * @param {string} partnerId - 파트너 ID
     */
    UIService.prototype.showShareModal = function(partnerId) {
        var self = this;

        var modal = document.getElementById('pm-share-modal');
        if (!modal) return;

        modal.classList.add('pm-modal-active');

        // 파트너 정보 가져오기 (Analytics용)
        var partnerName = '';
        if (self.partners && self.partners.length > 0) {
            var partner = self.partners.find(function(p) {
                return String(p.id) === String(partnerId);
            });
            if (partner) {
                partnerName = partner.name;
            }
        }

        // Analytics 추적 - 공유 시작
        if (window.AnalyticsService && window.analyticsInstance) {
            window.analyticsInstance.trackShareStart(partnerId, partnerName);
        }

        // 공유 링크
        var shareUrl = window.location.origin + window.location.pathname + '?partner=' + partnerId;

        // 링크 복사 버튼
        var copyBtn = document.getElementById('pm-share-copy');
        if (copyBtn) {
            copyBtn.onclick = function() {
                self.copyLink(shareUrl);
            };
        }

        // 카카오톡 공유 버튼
        var kakaoBtn = document.getElementById('pm-share-kakao');
        if (kakaoBtn) {
            kakaoBtn.onclick = function() {
                self.shareKakao(partnerId);
            };
        }
    };

    /**
     * 공유 모달 닫기
     */
    UIService.prototype.closeShareModal = function() {
        var modal = document.getElementById('pm-share-modal');
        if (modal) {
            modal.classList.remove('pm-modal-active');
        }
    };

    /**
     * 링크 복사
     * @param {string} url - 복사할 URL
     */
    UIService.prototype.copyLink = function(url) {
        var self = this;

        // URL에서 partnerId 추출
        var partnerId = '';
        try {
            var urlObj = new URL(url);
            partnerId = urlObj.searchParams.get('partner') || '';
        } catch (error) {
            console.error('[UI] URL 파싱 오류:', error);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(function() {
                    self.showToast('링크가 복사되었습니다.', 'success');
                    self.closeShareModal();

                    // Analytics 추적 - 링크 복사
                    if (window.AnalyticsService && window.analyticsInstance && partnerId) {
                        window.analyticsInstance.trackShareCopy(partnerId);
                    }
                })
                .catch(function(error) {
                    console.error('[UI] 링크 복사 오류:', error);
                    self.showToast('링크 복사에 실패했습니다.', 'error');
                });
        } else {
            // Fallback - HTML에 미리 만들어진 요소 사용 (createElement 제거)
            var textarea = document.getElementById('pm-clipboard-helper');
            if (!textarea) {
                self.showToast('클립보드 복사를 지원하지 않는 브라우저입니다.', 'error');
                return;
            }

            textarea.value = url;
            textarea.style.display = 'block';
            textarea.select();

            try {
                document.execCommand('copy');
                self.showToast('링크가 복사되었습니다.', 'success');
                self.closeShareModal();

                // Analytics 추적 - 링크 복사 (Fallback)
                if (window.AnalyticsService && window.analyticsInstance && partnerId) {
                    window.analyticsInstance.trackShareCopy(partnerId);
                }
            } catch (error) {
                console.error('[UI] 링크 복사 오류:', error);
                self.showToast('링크 복사에 실패했습니다.', 'error');
            }

            textarea.style.display = 'none';
            textarea.value = '';
        }
    };

    /**
     * 카카오톡 공유
     * @param {string} partnerId - 파트너 ID
     */
    UIService.prototype.shareKakao = function(partnerId) {
        var self = this;

        // Analytics 추적 - 카카오톡 공유
        if (window.AnalyticsService && window.analyticsInstance) {
            window.analyticsInstance.trackShareKakao(partnerId);
        }

        // 카카오톡 공유는 카카오 SDK 필요
        // 여기서는 간단한 알림만 표시
        self.showToast('카카오톡 공유 기능은 준비 중입니다.', 'info');
        self.closeShareModal();
    };

    // ========================================
    // 전역 등록
    // ========================================

    // 전역 인스턴스 (이벤트 핸들러에서 접근하기 위해)
    window.UIService = null;

    // 생성자만 등록
    window.UIServiceClass = UIService;

    // 전역 헬퍼 함수 (HTML onclick에서 사용)
    window.closeShareModal = function() {
        if (window.UIService) {
            window.UIService.closeShareModal();
        }
    };

})(window);
/**
 * 파트너맵 v3 - 메인 스크립트 (Part 2/2)
 * 책임: 초기화 오케스트레이터, 모듈 통합, 이벤트 핸들러
 * 메이크샵 D4 호환: async/await를 Promise 체이닝으로 변경
 */

(function(window) {
    'use strict';

    // ========================================
    // 전역 인스턴스
    // ========================================

    var apiClient = null;
    var mapService = null;
    var filterService = null;
    var searchService = null;
    var uiService = null;
    var analyticsService = null;

    // ========================================
    // 유틸리티 함수
    // ========================================

    /**
     * HTML 이스케이프 (XSS 방지)
     * @param {string} text - 이스케이프할 텍스트
     * @returns {string} 이스케이프된 텍스트
     */
    window.escapeHtml = function(text) {
        if (!text) return '';

        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return String(text).replace(/[&<>"']/g, function(m) {
            return map[m];
        });
    };

    /**
     * 디바운스 함수
     * @param {Function} func - 디바운스할 함수
     * @param {number} wait - 대기 시간 (밀리초)
     * @returns {Function} 디바운스된 함수
     */
    window.debounce = function(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    };

    /**
     * Ripple 효과 생성 (Material Design)
     * @param {Event} event - 클릭 이벤트
     * @param {HTMLElement} element - Ripple을 추가할 요소
     */
    window.createRipple = function(event, element) {
        // Ripple 컨테이너 클래스 추가
        if (!element.classList.contains('pm-ripple-container')) {
            element.classList.add('pm-ripple-container');
        }

        // Ripple 요소 생성
        var ripple = document.createElement('span');
        ripple.classList.add('pm-ripple');

        // 클릭 위치 계산
        var rect = element.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        // Ripple 크기 계산 (요소의 대각선 길이)
        var size = Math.max(rect.width, rect.height) * 2;

        // Ripple 스타일 설정
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.left = (x - size / 2) + 'px';
        ripple.style.top = (y - size / 2) + 'px';

        // Ripple 추가
        element.appendChild(ripple);

        // 애니메이션 종료 후 제거
        setTimeout(function() {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    };

    // ========================================
    // Ripple 효과 초기화
    // ========================================

    /**
     * Ripple 효과 초기화
     * 모든 버튼에 Ripple 이벤트 리스너 추가
     */
    function setupRipple() {
        var buttons = document.querySelectorAll(
            '#partnermap-container button, ' +
            '#partnermap-container .pm-action-btn, ' +
            '#partnermap-container .pm-gps-btn, ' +
            '#partnermap-container .pm-filter-tab, ' +
            '#partnermap-container .pm-share-btn'
        );

        buttons.forEach(function(button) {
            button.addEventListener('click', function(e) {
                window.createRipple(e, this);
            });
        });

        console.log('[Ripple] Ripple 효과 초기화 완료 (' + buttons.length + '개 버튼)');
    }

    // ========================================
    // GPS 기능
    // ========================================

    /**
     * GPS 버튼 설정
     */
    function setupGPSButton() {
        var gpsBtn = document.getElementById('pm-gps-btn');
        if (!gpsBtn) return;

        gpsBtn.addEventListener('click', function() {
            if (!navigator.geolocation) {
                uiService.showToast('GPS를 지원하지 않는 브라우저입니다.', 'error');
                return;
            }

            uiService.showToast('위치 정보를 가져오는 중...', 'info');

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    var lat = position.coords.latitude;
                    var lng = position.coords.longitude;

                    console.log('[GPS] 현재 위치:', lat, lng);

                    // 지도 이동
                    if (mapService) {
                        mapService.setReferencePoint(lat, lng);
                    }

                    // 필터 서비스에 기준점 설정
                    if (filterService) {
                        filterService.setReferencePoint(lat, lng);

                        // 거리순 정렬로 변경
                        var sortSelect = document.getElementById('pm-sort-select');
                        if (sortSelect) {
                            sortSelect.value = 'distance';
                            filterService.applyFilters();
                        }
                    }

                    // Analytics 추적 - GPS 검색 성공
                    if (window.AnalyticsService && window.analyticsInstance) {
                        window.analyticsInstance.trackGPSSearch(lat, lng, true);
                    }

                    uiService.showToast('현재 위치로 이동했습니다.', 'success');
                },
                function(error) {
                    console.error('[GPS] 위치 정보 오류:', error);

                    // Analytics 추적 - GPS 검색 실패
                    if (window.AnalyticsService && window.analyticsInstance) {
                        window.analyticsInstance.trackGPSSearch(null, null, false);
                    }

                    var message = CONFIG.errorMessages.gpsError;
                    if (error.code === 1) {
                        message = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                    } else if (error.code === 2) {
                        message = '위치 정보를 사용할 수 없습니다.';
                    } else if (error.code === 3) {
                        message = '위치 정보 요청 시간이 초과되었습니다.';
                    }

                    uiService.showToast(message, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * 주소 검색 버튼 설정
     */
    function setupAddressSearch() {
        var searchInput = document.getElementById('pm-address-search-input');
        var searchBtn = document.getElementById('pm-address-search-btn');

        if (!searchInput || !searchBtn) return;

        // 검색 버튼 클릭
        searchBtn.addEventListener('click', function() {
            var address = searchInput.value.trim();
            if (filterService) {
                filterService.searchByAddress(address);
            }
        });

        // Enter 키 입력
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                var address = searchInput.value.trim();
                if (filterService) {
                    filterService.searchByAddress(address);
                }
            }
        });

        console.log('[UI] 주소 검색 이벤트 설정 완료');
    }

    /**
     * 기준점 초기화 버튼 설정
     */
    function setupClearReferenceButton() {
        var clearBtn = document.getElementById('pm-clear-reference-btn');
        if (!clearBtn) return;

        clearBtn.addEventListener('click', function() {
            if (mapService) {
                mapService.clearReferencePoint();
            }

            var sortSelect = document.getElementById('pm-sort-select');
            if (sortSelect) {
                sortSelect.value = 'name';
            }

            if (filterService) {
                filterService.applyFilters();
            }

            clearBtn.style.display = 'none';
            uiService.showToast('기준점이 초기화되었습니다.', 'info');
        });
    }

    /**
     * 업체 목록 토글 버튼 설정
     */
    function setupListToggleButton() {
        var toggleBtn = document.getElementById('pm-toggle-list-btn');
        var mainContent = document.querySelector('.pm-main-content');

        if (!toggleBtn || !mainContent) return;

        // localStorage에서 토글 상태 불러오기
        var isListHidden = localStorage.getItem('pm_list_hidden') === 'true';

        // 초기 상태 설정
        if (isListHidden) {
            mainContent.classList.add('pm-list-hidden');
        }

        // 토글 버튼 클릭 이벤트
        toggleBtn.addEventListener('click', function() {
            mainContent.classList.toggle('pm-list-hidden');
            var isHidden = mainContent.classList.contains('pm-list-hidden');

            // localStorage에 상태 저장
            localStorage.setItem('pm_list_hidden', isHidden.toString());

            // 토스트 메시지
            if (isHidden) {
                uiService.showToast('업체 목록이 숨겨졌습니다.', 'info');
            } else {
                uiService.showToast('업체 목록이 표시됩니다.', 'info');
            }
        });

        console.log('[UI] 업체 목록 토글 버튼 설정 완료');
    }

    /**
     * 필터 섹션 토글 기능 설정 (모바일 UX 개선)
     */
    function setupFilterToggle() {
        var toggleBtn = document.getElementById('pm-filter-toggle');
        var filterSection = document.getElementById('pm-filter-section');

        if (!toggleBtn || !filterSection) return;

        // 초기 상태: 펼쳐져 있음
        var isCollapsed = localStorage.getItem('pm_filter_collapsed') === 'true';

        if (isCollapsed) {
            filterSection.setAttribute('data-collapsed', 'true');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.querySelector('.pm-filter-toggle-text').textContent = '필터 펼치기';
        }

        toggleBtn.addEventListener('click', function() {
            var currentCollapsed = filterSection.getAttribute('data-collapsed') === 'true';
            var newCollapsed = !currentCollapsed;

            filterSection.setAttribute('data-collapsed', newCollapsed.toString());
            toggleBtn.setAttribute('aria-expanded', (!newCollapsed).toString());
            toggleBtn.querySelector('.pm-filter-toggle-text').textContent = newCollapsed ? '필터 펼치기' : '필터 접기';

            localStorage.setItem('pm_filter_collapsed', newCollapsed.toString());

            if (newCollapsed) {
                uiService.showToast('필터가 접혔습니다.', 'info');
            } else {
                uiService.showToast('필터가 펼쳐졌습니다.', 'info');
            }
        });

        console.log('[UI] 필터 토글 버튼 설정 완료');
    }

    // ========================================
    // 초기화
    // ========================================

    /**
     * 파트너맵 초기화 (async/await 제거, Promise 체이닝 사용)
     */
    function initPartnerMap() {
        try {
            console.log('[Main] 파트너맵 v3 초기화 시작');

            // 0. 설정 검증
            var validation = CONFIG.validate();
            if (!validation.isValid) {
                console.error('[Main] 설정 오류:', validation.errors);
                validation.errors.forEach(function(error) {
                    console.error('  - ' + error);
                });
            }

            // 1. UI 서비스 초기화 (로딩 표시를 위해 가장 먼저)
            uiService = new window.UIServiceClass(CONFIG);
            window.UIService = uiService;  // 전역 인스턴스 등록
            uiService.showLoading();
            uiService.showSkeletonList(5);  // 스켈레톤 로딩 표시

            // 2. API 클라이언트 초기화
            apiClient = new window.PartnerAPI(CONFIG);
            console.log('[Main] API 클라이언트 생성 완료');

            // 3. 네이버 지도 SDK 로드
            mapService = new window.MapService(CONFIG);
            window.mapService = mapService;  // 전역 인스턴스 등록 (소문자!)

            // [NOTE] async/await 제거, Promise 체이닝 사용
            mapService.loadSDK()
                .then(function() {
                    // 4. 파트너 데이터 로드
                    console.log('[Main] 파트너 데이터 로드 시작...');
                    return apiClient.loadPartnerData();
                })
                .then(function(partners) {
                    console.log('[Main] 파트너 데이터 로드 완료 (' + partners.length + '개)');

                    // 5. 지도 초기화
                    mapService.init('naverMap');
                    console.log('[Main] 지도 초기화 완료');

                    // 6. 필터 서비스 초기화
                    filterService = new window.FilterService(CONFIG);
                    window.FilterService = filterService;  // 전역 인스턴스 등록
                    filterService.init(partners);

                    // 7. 검색 서비스 초기화
                    searchService = new window.SearchService(CONFIG);
                    window.SearchService = searchService;  // 전역 인스턴스 등록
                    searchService.init(partners);

                    // 8. UI 서비스 초기화 (이벤트 리스너)
                    uiService.init();

                    // 8.5. Analytics 서비스 초기화
                    if (window.AnalyticsService) {
                        analyticsService = new window.AnalyticsService(CONFIG);
                        window.analyticsInstance = analyticsService;  // 전역 인스턴스 등록
                        analyticsService.init('G-XXXXXXXXXX');  // 실제 GA4 측정 ID로 교체 필요
                        console.log('[Main] Analytics 서비스 초기화 완료');
                    }

                    // 9. 마커 생성
                    mapService.createMarkers(partners);

                    // 10. 스켈레톤 숨김 & 파트너 리스트 렌더링
                    uiService.hideSkeletonList();
                    uiService.renderPartnerList(partners);

                    // 11. GPS 버튼 설정
                    setupGPSButton();

                    // 12. 기준점 초기화 버튼 설정
                    setupClearReferenceButton();

                    // 12.5. 주소 검색 기능 설정
                    setupAddressSearch();

                    // 12.7. 업체 목록 토글 버튼 설정
                    setupListToggleButton();

                    // 12.8. 필터 섹션 토글 버튼 설정 (모바일 UX)
                    setupFilterToggle();

                    // 13. Ripple 효과 초기화
                    setupRipple();

                    // 13.5. 터치 서비스 초기화 (Mobile UX Phase 1)
                    if (window.TouchService) {
                        var touchService = new window.TouchService(CONFIG);
                        window.touchServiceInstance = touchService;  // 전역 인스턴스 등록
                        touchService.init();

                        // Pull to Refresh 활성화
                        touchService.enablePullToRefresh(document.body, {
                            onRefresh: function() {
                                console.log('[Touch] Pull to Refresh 실행');

                                // 파트너 데이터 새로고침
                                return apiClient.loadPartnerData(true)
                                    .then(function(refreshedPartners) {
                                        console.log('[Touch] 데이터 새로고침 완료:', refreshedPartners.length + '개');

                                        // 필터 서비스 업데이트
                                        if (filterService) {
                                            filterService.setPartners(refreshedPartners);
                                        }

                                        // 지도 마커 업데이트
                                        if (mapService) {
                                            mapService.createMarkers(refreshedPartners);
                                        }

                                        // UI 업데이트
                                        if (uiService) {
                                            uiService.renderPartnerList(refreshedPartners);
                                            uiService.showToast('데이터를 새로고침했습니다.', 'success');
                                        }

                                        // 필터 재적용
                                        if (filterService) {
                                            filterService.applyFilters();
                                        }
                                    })
                                    .catch(function(error) {
                                        console.error('[Touch] 새로고침 실패:', error);
                                        if (uiService) {
                                            uiService.showToast('새로고침에 실패했습니다.', 'error');
                                        }
                                    });
                            }
                        });

                        // 지도 고급 제스처 활성화
                        if (mapService && mapService.map) {
                            touchService.enablePinchZoom(mapService.map);
                            touchService.enableDoubleTapZoom(mapService.map);
                        }

                        console.log('[Main] 터치 서비스 초기화 완료');
                    }

                    // 13.6. FAB 서비스 초기화 (Mobile UX Phase 2)
                    if (window.FABService) {
                        var fabService = new window.FABService(CONFIG);
                        window.fabServiceInstance = fabService;  // 전역 인스턴스 등록
                        fabService.init();
                        console.log('[Main] FAB 서비스 초기화 완료');
                    }

                    // 14. URL 파라미터 처리 (특정 파트너 직접 접근)
                    handleUrlParams(partners);

                    // 15. 로딩 숨김
                    uiService.hideLoading();

                    // 16. 성공 알림
                    uiService.showToast(partners.length + '개의 제휴 업체를 불러왔습니다.', 'success');

                    console.log('[Main] 초기화 완료');
                })
                .catch(function(error) {
                    console.error('[Main] 초기화 실패:', error);

                    if (uiService) {
                        uiService.hideLoading();
                        uiService.showToast('지도를 불러오는 중 오류가 발생했습니다.', 'error');
                    }

                    // 오류 메시지 표시 - createElement 대신 미리 만들어진 요소 사용
                    var errorDiv = document.getElementById('pm-error-message');
                    if (errorDiv) {
                        errorDiv.style.cssText = 'display: block; padding: 40px; text-align: center; color: #F44336;';
                        errorDiv.innerHTML = '<h2>오류 발생</h2><p>' + CONFIG.errorMessages.apiError + '</p>' +
                                             '<p style="font-size: 14px; color: #808080;">자세한 내용은 콘솔을 확인해주세요.</p>';
                    }
                });

        } catch (error) {
            console.error('[Main] 초기화 실패:', error);

            if (uiService) {
                uiService.hideLoading();
                uiService.showToast('지도를 불러오는 중 오류가 발생했습니다.', 'error');
            }

            // 오류 메시지 표시
            var errorDiv = document.getElementById('pm-error-message');
            if (errorDiv) {
                errorDiv.style.cssText = 'display: block; padding: 40px; text-align: center; color: #F44336;';
                errorDiv.innerHTML = '<h2>오류 발생</h2><p>' + CONFIG.errorMessages.apiError + '</p>' +
                                     '<p style="font-size: 14px; color: #808080;">자세한 내용은 콘솔을 확인해주세요.</p>';
            }
        }
    }

    /**
     * URL 파라미터 처리
     * @param {Array} partners - 파트너 배열
     */
    function handleUrlParams(partners) {
        var urlParams = new URLSearchParams(window.location.search);
        var partnerId = urlParams.get('partner');

        if (partnerId) {
            var partner = partners.find(function(p) {
                return p.id == partnerId;
            });

            if (partner) {
                console.log('[Main] URL 파라미터로 파트너 직접 접근:', partner.name);

                // 모달 표시
                setTimeout(function() {
                    uiService.showPartnerDetail(partner);

                    // 지도 이동
                    if (mapService) {
                        mapService.moveTo(partner);
                    }
                }, 500);
            }
        }
    }

    // ========================================
    // 페이지 로드 시 초기화
    // ========================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPartnerMap);
    } else {
        initPartnerMap();
    }

    // ========================================
    // 전역 등록 (디버깅용)
    // ========================================

    window.PartnerMapApp = {
        apiClient: function() { return apiClient; },
        mapService: function() { return mapService; },
        filterService: function() { return filterService; },
        searchService: function() { return searchService; },
        uiService: function() { return uiService; },
        config: CONFIG
    };

})(window);

