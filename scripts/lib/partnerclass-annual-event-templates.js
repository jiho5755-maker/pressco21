'use strict';

var DEFAULT_EVENT_YEAR = 2026;
var DEFAULT_SEMINARS_TABLE_ID = 'm9gh6baz3vow966';
var DEFAULT_EMAIL_LOGS_TABLE_ID = 'mfsc5xg3ospeonz';

var EVENT_TEMPLATES = [
    {
        month: 1,
        day: 17,
        time: '19:30',
        location: '온라인 라이브',
        capacity: 120,
        season_key: 'NEW_YEAR',
        season_label: '신년',
        title_suffix: '신년 플라워 트렌드 킥오프',
        summary: '신년 클래스 트렌드와 연간 운영 방향을 공유하는 오프닝 세션',
        description: '신년 시즌 운영 방향, 대표 카테고리 트렌드, 연간 협회 일정 운영 팁을 한 번에 정리합니다.',
        audience: '파트너 · 협회원',
        image_url: 'https://dummyimage.com/1200x800/e7ece3/3d2c1e.jpg&text=Annual+Event+01'
    },
    {
        month: 2,
        day: 21,
        time: '14:00',
        location: '서울 성수동 파트너클래스 라운지',
        capacity: 40,
        season_key: 'GRADUATION',
        season_label: '졸업 시즌',
        title_suffix: '졸업식 플라워 부케 시즌 세미나',
        summary: '졸업 시즌 판매 포인트와 부케 클래스 운영 팁을 공유하는 세션',
        description: '졸업·입학 시즌 수요를 겨냥한 부케 클래스 상품 구성, 재료 준비, 후기 유도 시나리오를 함께 다룹니다.',
        audience: '파트너 · 강사',
        image_url: 'https://dummyimage.com/1200x800/f0e1d5/3d2c1e.jpg&text=Annual+Event+02'
    },
    {
        month: 3,
        day: 25,
        time: '19:00',
        location: '온라인 라이브',
        capacity: 160,
        season_key: 'SPRING_OPEN',
        season_label: '봄 시즌',
        title_suffix: '봄 시즌 클래스 운영 점검 세미나',
        summary: '5월 수요 전에 수강생 전환 흐름을 정비하는 봄 시즌 점검 세션',
        description: '어버이날·웨딩 시즌 직전, 전국 수강생 유입과 예약 전환을 높이기 위한 클래스 운영 포인트를 정리합니다.',
        audience: '파트너 · 운영팀',
        image_url: 'https://dummyimage.com/1200x800/e5edd7/3d2c1e.jpg&text=Annual+Event+03'
    },
    {
        month: 4,
        day: 18,
        time: '14:00',
        location: '서울 성수동 파트너클래스 라운지',
        capacity: 48,
        season_key: 'PARENTS_DAY',
        season_label: '가정의 달 준비',
        title_suffix: '어버이날 선물 클래스 기획 워크숍',
        summary: '가정의 달 선물 수요에 맞춘 체험형 클래스 설계 워크숍',
        description: '어버이날 꽃선물, 용돈박스, 키트 연동 클래스 기획과 홍보 카피를 실무 중심으로 점검합니다.',
        audience: '파트너 · 협회원',
        image_url: 'https://dummyimage.com/1200x800/f4ead8/3d2c1e.jpg&text=Annual+Event+04'
    },
    {
        month: 5,
        day: 22,
        time: '19:30',
        location: '온라인 라이브',
        capacity: 140,
        season_key: 'WEDDING',
        season_label: '웨딩 시즌',
        title_suffix: '웨딩 시즌 부케 매출 점프 세미나',
        summary: '웨딩 클래스와 웨딩 키트 판매를 함께 키우는 성장 세션',
        description: '웨딩 클래스 패키지 구성, 추천 상품 묶음, 예약 후 재구매 동선을 실제 사례 중심으로 공유합니다.',
        audience: '파트너 · 협회원',
        image_url: 'https://dummyimage.com/1200x800/efe2e8/3d2c1e.jpg&text=Annual+Event+05'
    },
    {
        month: 6,
        day: 19,
        time: '14:00',
        location: '경기 성남 파트너 스튜디오',
        capacity: 36,
        season_key: 'SUMMER',
        season_label: '여름 시즌',
        title_suffix: '여름 온라인 클래스 전환 세미나',
        summary: '비수기 구간에 온라인 클래스와 키트 판매를 엮는 전환 세션',
        description: '오프라인 수요가 줄어드는 구간에 온라인 강의, 라이브 세션, 키트 재구매 흐름을 묶는 운영안을 정리합니다.',
        audience: '파트너 · 운영팀',
        image_url: 'https://dummyimage.com/1200x800/dbe8ea/3d2c1e.jpg&text=Annual+Event+06'
    },
    {
        month: 7,
        day: 24,
        time: '19:30',
        location: '온라인 라이브',
        capacity: 180,
        season_key: 'VACATION',
        season_label: '여름 방학',
        title_suffix: '방학 시즌 원데이 클래스 확장 세미나',
        summary: '방학 시즌 원데이 클래스와 가족 단위 체험을 늘리는 세션',
        description: '지역 검색 유입, 방학 특화 카테고리, 가족 동반 체험 패키지를 활용한 예약 확장 전략을 다룹니다.',
        audience: '파트너 · 강사',
        image_url: 'https://dummyimage.com/1200x800/d7ebe5/3d2c1e.jpg&text=Annual+Event+07'
    },
    {
        month: 8,
        day: 21,
        time: '14:00',
        location: '서울 강남 오프라인 세미나홀',
        capacity: 60,
        season_key: 'CHUSEOK_PREP',
        season_label: '추석 준비',
        title_suffix: '추석 선물 키트 사전 준비 세미나',
        summary: '추석 시즌 전용 상품과 클래스 홍보를 사전 정비하는 세션',
        description: '추석 전용 키트, 기업 선물 수요, 협회원 전용 상품 노출 전략을 협회와 함께 설계합니다.',
        audience: '파트너 · 협회원',
        image_url: 'https://dummyimage.com/1200x800/f2e2c6/3d2c1e.jpg&text=Annual+Event+08'
    },
    {
        month: 9,
        day: 12,
        time: '19:00',
        location: '온라인 라이브',
        capacity: 150,
        season_key: 'CHUSEOK',
        season_label: '추석 시즌',
        title_suffix: '추석 시즌 재구매 리텐션 세미나',
        summary: '추석 시즌 이후 재구매와 후기 전환을 높이는 리텐션 세션',
        description: '명절 시즌 이후 재료 재구매, 후기 리워드, 연말 행사로 이어지는 고객 리텐션 구조를 점검합니다.',
        audience: '운영팀 · 파트너',
        image_url: 'https://dummyimage.com/1200x800/eadfc9/3d2c1e.jpg&text=Annual+Event+09'
    },
    {
        month: 10,
        day: 23,
        time: '14:00',
        location: '부산 해운대 파트너 스튜디오',
        capacity: 44,
        season_key: 'AUTUMN',
        season_label: '가을 시즌',
        title_suffix: '가을 전시·플리마켓 운영 세미나',
        summary: '지역 행사와 협회 일정을 클래스 허브 안에서 홍보하는 가을 세션',
        description: '오프라인 행사, 플리마켓, 협회 전시 일정 홍보를 자사몰과 연결해 전환을 만드는 운영안을 정리합니다.',
        audience: '협회 · 파트너',
        image_url: 'https://dummyimage.com/1200x800/e9d8c7/3d2c1e.jpg&text=Annual+Event+10'
    },
    {
        month: 11,
        day: 20,
        time: '19:30',
        location: '온라인 라이브',
        capacity: 180,
        season_key: 'CHRISTMAS_PREP',
        season_label: '크리스마스 준비',
        title_suffix: '크리스마스 클래스 사전 오픈 세미나',
        summary: '크리스마스 예약 오픈과 시즌 상품 묶음 전략을 공유하는 세션',
        description: '연말 시즌 예약 오픈 일정, 후기 이벤트, 기프트형 상품 묶음 운영을 한 번에 점검합니다.',
        audience: '파트너 · 운영팀',
        image_url: 'https://dummyimage.com/1200x800/e5ddd9/3d2c1e.jpg&text=Annual+Event+11'
    },
    {
        month: 12,
        day: 12,
        time: '14:00',
        location: '서울 성수동 파트너클래스 라운지',
        capacity: 56,
        season_key: 'YEAR_END',
        season_label: '연말 시즌',
        title_suffix: '연말 결산과 내년 준비 세미나',
        summary: '연말 운영 결산과 다음 해 캘린더 초안을 정리하는 마감 세션',
        description: '연말 운영 리포트, 협회 성과 공유, 다음 해 시즌 캘린더 초안을 한 자리에서 정리합니다.',
        audience: '협회 · 운영팀 · 파트너',
        image_url: 'https://dummyimage.com/1200x800/e3e6ef/3d2c1e.jpg&text=Annual+Event+12'
    }
];

function pad2(value) {
    return String(value).padStart(2, '0');
}

function formatDate(year, month, day) {
    return String(year) + '-' + pad2(month) + '-' + pad2(day);
}

function buildDescription(affiliationName, template) {
    return '<p>' + affiliationName + ' 협회와 PRESSCO21이 함께 운영하는 ' + template.season_label + ' 세미나입니다.</p>'
        + '<p>' + template.description + '</p>'
        + '<p>대상: ' + template.audience + '</p>';
}

function normalizeAffiliationName(value) {
    return String(value || '').trim() || '협회';
}

function normalizeAffiliationCode(value) {
    return String(value || '').trim() || 'AFFILIATION';
}

function buildEventRow(affiliation, year, template) {
    var affiliationCode = normalizeAffiliationCode(affiliation && affiliation.affiliation_code);
    var affiliationName = normalizeAffiliationName(affiliation && affiliation.name);

    return {
        seminar_id: 'SEM_' + affiliationCode + '_CAL_' + String(year) + pad2(template.month) + '_01',
        affiliation_code: affiliationCode,
        title: affiliationName + ' ' + template.title_suffix,
        description: buildDescription(affiliationName, template),
        seminar_date: formatDate(year, template.month, template.day),
        seminar_time: template.time,
        location: template.location,
        capacity: template.capacity,
        status: 'ACTIVE',
        image_url: template.image_url,
        _month: template.month,
        _season_key: template.season_key,
        _season_label: template.season_label,
        _summary: template.summary,
        _audience: template.audience
    };
}

function buildAnnualCalendarRows(affiliations, year) {
    var targetYear = Number(year) || DEFAULT_EVENT_YEAR;
    var rows = [];
    var i;
    var j;

    for (i = 0; i < (affiliations || []).length; i += 1) {
        for (j = 0; j < EVENT_TEMPLATES.length; j += 1) {
            rows.push(buildEventRow(affiliations[i], targetYear, EVENT_TEMPLATES[j]));
        }
    }

    return rows;
}

function getMonthCoverage(rows) {
    var seen = {};
    var months = [];
    var i;

    for (i = 0; i < (rows || []).length; i += 1) {
        seen[rows[i]._month] = true;
    }

    for (i = 1; i <= 12; i += 1) {
        if (seen[i]) {
            months.push(i);
        }
    }

    return months;
}

module.exports = {
    DEFAULT_EVENT_YEAR: DEFAULT_EVENT_YEAR,
    DEFAULT_SEMINARS_TABLE_ID: DEFAULT_SEMINARS_TABLE_ID,
    DEFAULT_EMAIL_LOGS_TABLE_ID: DEFAULT_EMAIL_LOGS_TABLE_ID,
    EVENT_TEMPLATES: EVENT_TEMPLATES,
    buildAnnualCalendarRows: buildAnnualCalendarRows,
    getMonthCoverage: getMonthCoverage
};
