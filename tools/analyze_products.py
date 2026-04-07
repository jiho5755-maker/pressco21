#!/usr/bin/env python3
"""
메이크샵 전체 상품 XML 분석 및 분류 스크립트
- 강사공간/개인결제건 제외
- 단품/미진열/품절/옵션/추가상품 분류
- 이미지 호스팅 서버 분류
"""

import xml.etree.ElementTree as ET
import csv
import json
import re
import os
from collections import defaultdict, Counter
from urllib.parse import urlparse

# === 설정 ===
INPUT_FILE = '/Users/jangjiho/Downloads/all_jewoo_20260407133714.xml'
OUTPUT_DIR = '/Users/jangjiho/workspace/pressco21/tools/product_analysis'

NS_SS = 'urn:schemas-microsoft-com:office:spreadsheet'

# 필드 이름 목록 (0-indexed, 헤더 2행 기준)
FIELD_NAMES = [
    'category_code', 'cate1_name', 'cate2_name', 'cate3_name',
    'product_uid', 'match_cate', 'match_cate1', 'match_cate2',
    'match_cate3', 'match_cate4', 'gid', 'rental_product',
    'product_name', 'mobile_product_name', 'product_name_eng',
    'match_product_name', 'product_colors', 'opt_mandatory',
    'opt_mix', 'opt_name', 'opt_value', 'opt_price',
    'opt_image', 'opt_detail_image', 'opt_color', 'opt_type',
    'opt_use', 'opt_oneclick', 'opt_guide', 'opt_values',
    'sto_type', 'sto_price', 'sto_stock', 'sto_unlimit',
    'sto_order_stock', 'sto_safe_use', 'sto_safe_stock',
    'sto_stop_use', 'sto_stop_stock', 'sto_code', 'sto_note',
    'sto_state', 'option_display_type', 'sto_id', 'sell_price',
    'subs_discount', 'new_weight', 'stock', 'retail_price',
    'original_price', 'dicker', 'reserve', 'mobile_reserve',
    'point', 'np_condition', 'np_view', 'np_product_options',
    'np_product_flag', 'np_age_group', 'np_gender', 'key_word',
    'sell_accept', 'non_display', 'max_image', 'mini_image',
    'tiny_image', 'tiny_gallery_image', 'mobile_image',
    'gallery_image', 'product_detail', 'mobile_product_detail',
    'multi_images', 'sub_brand_name', 'min_stock', 'max_stock',
    'release_date', 'bank_only', 'production', 'origin',
    'warning_info', 'brand_name', 'model_name', 'uniqueness',
    'rental_info', 'admin_memo', 'supply_product_name',
    'supply_name', 'use_tax', 'vat_type', 'delivery',
    'product_info_title', 'product_info', 'provider',
    'provider_code', 'reg_date', 'mod_date', 'cnt_view',
    'cnt_order', 'cnt_basket', 'best_review_display',
    'best_product_display', 'product_url', 'pvd_commission',
    'pvd_burden', 'promo_code', 'discount_code', 'discount_title',
    'discount_price', 'discount_date', 'opt_group_cnt',
    'sto_image', 'sto_detail_image', 'sto_cnt', 'review_cnt',
    'freedeli', 'common_use', 'common_use_event',
    'fitting_model_name', 'prd_soldout', 'display_date',
    'exception_apply_coupon', 'reserve_unable_payment',
    'gift_excluded_payment', 'powerapp_excluded_discount',
    'add_info2', 'ps_num', 'ems_type', 'hscode', 'volumn',
    'weight', 'prd_gift', 'limit_type', 'size_chart',
    'access_auth', 'is_add_composition', 'add_composition_name',
    'barcode'
]

FIELD_INDEX = {name: idx for idx, name in enumerate(FIELD_NAMES)}


def parse_xml_rows(filepath):
    """XML을 스트리밍 파싱하여 행 데이터 반환"""
    rows = []
    current_row_cells = []
    row_count = 0

    for event, elem in ET.iterparse(filepath, events=['start', 'end']):
        tag = elem.tag.replace(f'{{{NS_SS}}}', '')

        if event == 'start' and tag == 'Row':
            current_row_cells = []

        elif event == 'end' and tag == 'Row':
            row_count += 1
            if row_count > 2:  # 헤더 2행 스킵
                rows.append(current_row_cells)
            current_row_cells = []
            elem.clear()

        elif event == 'end' and tag == 'Cell':
            # ss:Index 속성 처리
            index_attr = elem.get(f'{{{NS_SS}}}Index')
            if index_attr:
                target_idx = int(index_attr) - 1  # 1-based → 0-based
                # 빈 셀로 채우기
                while len(current_row_cells) < target_idx:
                    current_row_cells.append('')

            # Data 추출
            data_elem = elem.find(f'{{{NS_SS}}}Data')
            value = ''
            if data_elem is not None and data_elem.text:
                value = data_elem.text.strip()
            current_row_cells.append(value)

    return rows


def get_field(cells, field_name):
    """셀 배열에서 필드값 추출"""
    idx = FIELD_INDEX.get(field_name)
    if idx is None or idx >= len(cells):
        return ''
    return cells[idx]


def group_products(rows):
    """행들을 product_uid 기준으로 그룹핑 (옵션 조합 행 병합)"""
    products = []
    current_product = None

    for cells in rows:
        uid = get_field(cells, 'product_uid')

        if uid:
            # 새 상품 시작
            if current_product:
                products.append(current_product)
            current_product = {
                'cells': cells,
                'option_rows': [],
                'uid': uid
            }
        else:
            # 옵션 조합 추가 행 (uid 없음 = 이전 상품의 옵션)
            if current_product:
                current_product['option_rows'].append(cells)

    if current_product:
        products.append(current_product)

    return products


def extract_image_hosts(cells):
    """이미지 URL에서 호스트 추출"""
    hosts = set()
    image_fields = ['max_image', 'mini_image', 'tiny_image',
                    'mobile_image', 'gallery_image', 'multi_images']

    for field in image_fields:
        url = get_field(cells, field)
        if url and url.startswith('http'):
            for u in url.split('\n'):
                u = u.strip()
                if u.startswith('http'):
                    try:
                        parsed = urlparse(u)
                        hosts.add(parsed.netloc)
                    except Exception:
                        pass

    # product_detail에서도 이미지 호스트 추출
    detail = get_field(cells, 'product_detail')
    if detail:
        img_urls = re.findall(r'(?:src|href)=["\']?(https?://[^"\'>\s]+)', detail)
        for u in img_urls:
            try:
                parsed = urlparse(u)
                if any(ext in parsed.path.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    hosts.add(parsed.netloc)
            except Exception:
                pass

    return hosts


def analyze_options(product):
    """상품의 옵션 구조 분석"""
    cells = product['cells']
    opt_name = get_field(cells, 'opt_name')
    opt_value = get_field(cells, 'opt_value')
    opt_use = get_field(cells, 'opt_use')
    opt_type = get_field(cells, 'opt_type')
    is_add = get_field(cells, 'is_add_composition')
    add_name = get_field(cells, 'add_composition_name')

    has_options = opt_use == '사용' and opt_name
    # "사용안함"이 아니라 실제 추가상품 데이터가 있는 경우만
    has_add_composition = bool(add_name and add_name.strip())

    # 옵션 단 수 분석
    option_dimensions = 0
    option_dim_names = []
    if has_options and opt_name:
        # 옵션명이 여러 단이면 개행이나 $$ 등으로 구분
        # 실제 데이터에서 확인 필요 - 일단 개행과 $$ 모두 처리
        dims = re.split(r'\n|\\n|\$\$', opt_name)
        dims = [d.strip() for d in dims if d.strip()]
        option_dimensions = len(dims)
        option_dim_names = dims

    # 옵션 조합 행 수
    option_combo_count = 1 + len(product['option_rows'])

    return {
        'has_options': has_options,
        'opt_name': opt_name,
        'opt_value': opt_value,
        'opt_type': opt_type,
        'option_dimensions': option_dimensions,
        'option_dim_names': option_dim_names,
        'option_combo_count': option_combo_count,
        'has_add_composition': has_add_composition,
        'add_composition_name': add_name
    }


def is_soldout(product):
    """품절 여부 판단"""
    cells = product['cells']
    stock = get_field(cells, 'stock')

    # 재고 기반 (빈값/무제한/unlimited = 무제한이므로 품절 아님)
    if stock in ['0', '품절']:
        return True
    if stock in ['', '무제한', 'unlimited']:
        return False

    # 옵션별 판매상태 확인 (sto_state)
    sto_state = get_field(cells, 'sto_state')
    if sto_state == '품절':
        # 모든 옵션이 품절인지 확인
        all_soldout = True
        if product['option_rows']:
            for opt_row in product['option_rows']:
                opt_sto = get_field_from_cells(opt_row, 'sto_state')
                if opt_sto and opt_sto != '품절':
                    all_soldout = False
                    break
        return all_soldout

    # 주의: prd_soldout은 "품절 시 설정"이지 현재 품절 여부가 아님 → 사용 안 함

    return False


def get_field_from_cells(cells, field_name):
    """직접 셀 배열에서 필드값 추출"""
    idx = FIELD_INDEX.get(field_name)
    if idx is None or idx >= len(cells):
        return ''
    return cells[idx]


def classify_products(products):
    """상품 분류"""
    excluded_instructor = []  # 강사공간
    excluded_personal = []     # 개인결제
    actual_products = []       # 실제 상품

    # 1차: 제외 대상 분리
    for p in products:
        cells = p['cells']
        cate1 = get_field(cells, 'cate1_name')
        product_name = get_field(cells, 'product_name')

        if cate1 == '강사공간':
            excluded_instructor.append(p)
        elif cate1 == '개인결제창' or '개인결제' in product_name:
            excluded_personal.append(p)
        else:
            actual_products.append(p)

    # 2차: 실제 상품 분류
    cat_simple_live = []        # 1. 단품 (진열+라이브+품절아님+옵션없음)
    cat_not_displayed = []      # 2. 미진열
    cat_soldout = []            # 3. 품절
    cat_option_single = []      # 4a. 옵션 1단
    cat_option_multi = []       # 4b. 옵션 여러단
    cat_add_composition = []    # 5. 추가상품
    cat_other = []              # 기타 (분류 불가)

    # 이미지 호스팅 분석
    image_host_counter = Counter()
    products_by_host = defaultdict(list)

    # 추가 분석
    no_price = []               # 가격 0원
    no_image = []               # 이미지 없음
    sell_not_accepted = []      # 판매불가
    old_products = []           # 오래된 상품 (수정 2년 이상)

    for p in actual_products:
        cells = p['cells']
        uid = p['uid']
        name = get_field(cells, 'product_name')
        non_display = get_field(cells, 'non_display')
        sell_accept = get_field(cells, 'sell_accept')
        sell_price = get_field(cells, 'sell_price')
        opt_info = analyze_options(p)

        # 이미지 호스팅 분석
        hosts = extract_image_hosts(cells)
        for h in hosts:
            image_host_counter[h] += 1
            products_by_host[h].append({'product_uid': uid, 'product_name': name})

        # 추가상품 플래그 (별도 분류, 다른 분류와 중복 가능)
        if opt_info['has_add_composition']:
            cat_add_composition.append(p)

        # 분류 로직
        if non_display == '미진열':
            cat_not_displayed.append(p)
        elif is_soldout(p):
            cat_soldout.append(p)
        elif opt_info['has_options']:
            if opt_info['option_dimensions'] <= 1:
                cat_option_single.append(p)
            else:
                cat_option_multi.append(p)
        else:
            # 단품 (옵션 없고, 진열 중이고, 품절 아님)
            if sell_accept == 'Y' and non_display == '진열':
                cat_simple_live.append(p)
            else:
                cat_other.append(p)

        # 추가 이슈 탐지
        try:
            price = int(sell_price) if sell_price else 0
        except ValueError:
            price = 0
        if price == 0:
            no_price.append(p)

        max_img = get_field(cells, 'max_image')
        if not max_img or not max_img.startswith('http'):
            no_image.append(p)

        if sell_accept == 'N':
            sell_not_accepted.append(p)

    return {
        'excluded_instructor': excluded_instructor,
        'excluded_personal': excluded_personal,
        'actual_products': actual_products,
        'cat_simple_live': cat_simple_live,
        'cat_not_displayed': cat_not_displayed,
        'cat_soldout': cat_soldout,
        'cat_option_single': cat_option_single,
        'cat_option_multi': cat_option_multi,
        'cat_add_composition': cat_add_composition,
        'cat_other': cat_other,
        'image_host_counter': image_host_counter,
        'products_by_host': products_by_host,
        'no_price': no_price,
        'no_image': no_image,
        'sell_not_accepted': sell_not_accepted,
    }


def product_summary(p):
    """상품 요약 정보 딕셔너리"""
    cells = p['cells']
    opt_info = analyze_options(p)
    return {
        'product_uid': p['uid'],
        'product_name': get_field(cells, 'product_name'),
        'category': f"{get_field(cells, 'cate1_name')} > {get_field(cells, 'cate2_name')} > {get_field(cells, 'cate3_name')}".strip(' >'),
        'sell_price': get_field(cells, 'sell_price'),
        'original_price': get_field(cells, 'original_price'),
        'stock': get_field(cells, 'stock'),
        'non_display': get_field(cells, 'non_display'),
        'sell_accept': get_field(cells, 'sell_accept'),
        'opt_name': opt_info['opt_name'],
        'opt_value': opt_info['opt_value'],
        'opt_type': opt_info['opt_type'],
        'option_dimensions': opt_info['option_dimensions'],
        'option_combos': opt_info['option_combo_count'],
        'has_add_composition': opt_info['has_add_composition'],
        'add_composition_name': opt_info['add_composition_name'],
        'admin_memo': get_field(cells, 'admin_memo'),
        'reg_date': get_field(cells, 'reg_date'),
        'mod_date': get_field(cells, 'mod_date'),
        'cnt_order': get_field(cells, 'cnt_order'),
        'product_url': get_field(cells, 'product_url'),
        'image_host': ','.join(extract_image_hosts(cells)),
        'sto_state': get_field(cells, 'sto_state'),
        'prd_soldout': get_field(cells, 'prd_soldout'),
        'key_word': get_field(cells, 'key_word'),
        'brand_name': get_field(cells, 'brand_name'),
    }


def write_csv(filepath, products, extra_fields=None):
    """상품 목록을 CSV로 저장"""
    if not products:
        return

    summaries = [product_summary(p) for p in products]
    fieldnames = list(summaries[0].keys())
    if extra_fields:
        fieldnames.extend(extra_fields)

    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summaries)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 60)
    print("메이크샵 전체 상품 분석 시작")
    print("=" * 60)

    # 1단계: XML 파싱
    print("\n[1/4] XML 파싱 중... (1M+ 줄, 잠시 대기)")
    rows = parse_xml_rows(INPUT_FILE)
    print(f"  → 총 {len(rows):,}행 파싱 완료")

    # 2단계: 상품 그룹핑
    print("\n[2/4] 상품 그룹핑 (옵션 조합 행 병합)...")
    products = group_products(rows)
    print(f"  → 총 {len(products):,}개 상품 (고유 product_uid 기준)")

    # 3단계: 분류
    print("\n[3/4] 상품 분류 중...")
    result = classify_products(products)

    # 4단계: 결과 출력 및 CSV 저장
    print("\n[4/4] 결과 저장 중...")

    # === 요약 출력 ===
    print("\n" + "=" * 60)
    print("분류 결과 요약")
    print("=" * 60)

    print(f"\n■ 전체 상품: {len(products):,}개")
    print(f"  ├─ 제외: 강사공간 {len(result['excluded_instructor']):,}개")
    print(f"  ├─ 제외: 개인결제 {len(result['excluded_personal']):,}개")
    print(f"  └─ 실제 상품: {len(result['actual_products']):,}개")

    print(f"\n■ 실제 상품 분류:")
    print(f"  1. 단품 (진열+라이브): {len(result['cat_simple_live']):,}개")
    print(f"  2. 미진열:             {len(result['cat_not_displayed']):,}개")
    print(f"  3. 품절:               {len(result['cat_soldout']):,}개")
    print(f"  4a. 옵션 1단:          {len(result['cat_option_single']):,}개")
    print(f"  4b. 옵션 여러단:       {len(result['cat_option_multi']):,}개")
    print(f"  5. 추가상품 (중복):    {len(result['cat_add_composition']):,}개")
    print(f"  기타:                  {len(result['cat_other']):,}개")

    print(f"\n■ 추가 이슈:")
    print(f"  - 가격 0원: {len(result['no_price']):,}개")
    print(f"  - 이미지 없음: {len(result['no_image']):,}개")
    print(f"  - 판매불가(N): {len(result['sell_not_accepted']):,}개")

    print(f"\n■ 이미지 호스팅 서버 분포:")
    for host, count in result['image_host_counter'].most_common():
        print(f"  - {host}: {count:,}개 상품")

    # === CSV 저장 ===
    write_csv(f'{OUTPUT_DIR}/1_단품_라이브.csv', result['cat_simple_live'])
    write_csv(f'{OUTPUT_DIR}/2_미진열.csv', result['cat_not_displayed'])
    write_csv(f'{OUTPUT_DIR}/3_품절.csv', result['cat_soldout'])
    write_csv(f'{OUTPUT_DIR}/4a_옵션_1단.csv', result['cat_option_single'])
    write_csv(f'{OUTPUT_DIR}/4b_옵션_여러단.csv', result['cat_option_multi'])
    write_csv(f'{OUTPUT_DIR}/5_추가상품.csv', result['cat_add_composition'])
    write_csv(f'{OUTPUT_DIR}/0_기타.csv', result['cat_other'])
    write_csv(f'{OUTPUT_DIR}/이슈_가격0원.csv', result['no_price'])
    write_csv(f'{OUTPUT_DIR}/이슈_이미지없음.csv', result['no_image'])
    write_csv(f'{OUTPUT_DIR}/이슈_판매불가.csv', result['sell_not_accepted'])
    write_csv(f'{OUTPUT_DIR}/제외_강사공간.csv', result['excluded_instructor'])
    write_csv(f'{OUTPUT_DIR}/제외_개인결제.csv', result['excluded_personal'])

    # 이미지 호스팅별 상품 목록
    for host, prods in result['products_by_host'].items():
        safe_host = host.replace(':', '_').replace('/', '_')
        with open(f'{OUTPUT_DIR}/이미지호스트_{safe_host}.csv', 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=['product_uid', 'product_name'])
            writer.writeheader()
            writer.writerows(prods)

    # 카테고리별 분포
    cate_counter = Counter()
    for p in result['actual_products']:
        cate1 = get_field(p['cells'], 'cate1_name')
        cate_counter[cate1] += 1
    print(f"\n■ 카테고리(대분류) 분포:")
    for cate, count in cate_counter.most_common():
        print(f"  - {cate or '(미지정)'}: {count:,}개")

    # 옵션 타입별 분포
    opt_type_counter = Counter()
    for p in result['cat_option_single'] + result['cat_option_multi']:
        opt_type = get_field(p['cells'], 'opt_type')
        opt_type_counter[opt_type] += 1
    if opt_type_counter:
        print(f"\n■ 옵션 타입 분포 (옵션 있는 상품 중):")
        for otype, count in opt_type_counter.most_common():
            print(f"  - {otype or '(미지정)'}: {count:,}개")

    print(f"\n✅ CSV 파일 저장 완료: {OUTPUT_DIR}/")
    print(f"   총 {len(os.listdir(OUTPUT_DIR))}개 파일 생성")


if __name__ == '__main__':
    main()
