#!/usr/bin/env python3
"""BaroBill test-server SOAP smoke tester.

Reads secrets only from environment variables and never prints them.
This script is intentionally independent of n8n runtime so that we can verify
BaroBill test-server credentials before deploying the n8n workflow.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any

DEFAULT_TEST_URL = "https://testws.baroservice.com/TI.asmx"
DEFAULT_PROD_URL = "https://ws.baroservice.com/TI.asmx"
DEFAULT_ENV_FILE = "~/.config/pressco21/barobill-test.env"
NS = "http://ws.baroservice.com/"
SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"



def load_env_file(path: str = DEFAULT_ENV_FILE) -> None:
    env_path = os.path.expanduser(path)
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if not key or key in os.environ:
                continue
            os.environ[key] = value

def digits_only(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def mask_certkey(value: str) -> str:
    value = value.strip()
    return "configured" if value else "missing"


def mask_text(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if len(value) <= 2:
        return value[0] + "*"
    if "@" in value:
        name, _, domain = value.partition("@")
        return (name[:2] + "***@" + domain) if name else "***@" + domain
    return value[:2] + "***" + value[-1:]


def xml_escape(value: Any) -> str:
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def soap_envelope(body_xml: str) -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
        f'xmlns:soap="{SOAP_NS}">'
        f"<soap:Body>{body_xml}</soap:Body></soap:Envelope>"
    )


def method_body(method: str, fields: dict[str, Any]) -> str:
    parts = [f'<{method} xmlns="{NS}">']
    for key, value in fields.items():
        parts.append(f"<{key}>{xml_escape(value)}</{key}>")
    parts.append(f"</{method}>")
    return "".join(parts)


def local_mgt_key(invoice_no: str) -> str:
    stamp = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).strftime("%m%d%H%M%S")
    safe_invoice = re.sub(r"[^0-9A-Za-z]", "", invoice_no)[-6:] or "INV"
    return f"PCTEST-{safe_invoice}-{stamp}"[:24]


@dataclass
class SoapResponse:
    http_status: int
    xml_text: str
    elapsed_ms: int


class BaroBillSmokeError(RuntimeError):
    pass


class BaroBillClient:
    def __init__(self, certkey: str, corp_num: str, service_url: str) -> None:
        self.certkey = certkey.strip()
        self.corp_num = digits_only(corp_num)
        self.service_url = service_url.rstrip("/")
        if not self.certkey:
            raise BaroBillSmokeError("BAROBILL_CERTKEY is required")
        if len(self.corp_num) != 10:
            raise BaroBillSmokeError("BAROBILL_CORP_NUM must be 10 digits")

    def call(self, method: str, fields: dict[str, Any], *, timeout: int = 30) -> SoapResponse:
        envelope = soap_envelope(method_body(method, fields))
        payload = envelope.encode("utf-8")
        req = urllib.request.Request(
            self.service_url,
            data=payload,
            headers={
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": f"{NS}{method}",
            },
            method="POST",
        )
        started = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", "replace")
                return SoapResponse(resp.status, body, int((time.monotonic() - started) * 1000))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            return SoapResponse(exc.code, body, int((time.monotonic() - started) * 1000))

    def call_raw(self, method: str, body_xml: str, *, timeout: int = 45) -> SoapResponse:
        payload = soap_envelope(body_xml).encode("utf-8")
        req = urllib.request.Request(
            self.service_url,
            data=payload,
            headers={
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": f"{NS}{method}",
            },
            method="POST",
        )
        started = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", "replace")
                return SoapResponse(resp.status, body, int((time.monotonic() - started) * 1000))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            return SoapResponse(exc.code, body, int((time.monotonic() - started) * 1000))

    def simple(self, method: str, fields: dict[str, Any]) -> dict[str, Any]:
        resp = self.call(method, fields)
        result_tag = f"{method}Result"
        return {
            "method": method,
            "httpStatus": resp.http_status,
            "elapsedMs": resp.elapsed_ms,
            "result": extract_text(resp.xml_text, result_tag),
            "fault": extract_text(resp.xml_text, "faultstring"),
        }


def extract_text(xml_text: str, tag: str) -> str:
    if not xml_text:
        return ""
    # SOAP samples use namespaces inconsistently in descendants; use local-name matching.
    try:
        root = ET.fromstring(xml_text.encode("utf-8"))
        for elem in root.iter():
            local = elem.tag.rsplit("}", 1)[-1]
            if local == tag:
                return "".join(elem.itertext()).strip()
    except ET.ParseError:
        pass
    match = re.search(rf"<{re.escape(tag)}[^>]*>([\s\S]*?)</{re.escape(tag)}>", xml_text, re.I)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip() if match else ""


def extract_status(xml_text: str) -> dict[str, Any]:
    fields = [
        "MgtKey",
        "InvoiceKey",
        "BarobillState",
        "IsOpened",
        "IsConfirmed",
        "RegistDT",
        "WriteDate",
        "PreIssueDT",
        "IssueDT",
        "Remark1",
        "Remark2",
        "NTSSendState",
        "NTSSendKey",
        "NTSSendResult",
        "NTSSendDT",
        "NTSResultDT",
    ]
    return {field: extract_text(xml_text, field) for field in fields}


def print_result(row: dict[str, Any]) -> None:
    public = dict(row)
    print("-", public)


def extract_contacts(xml_text: str) -> list[dict[str, str]]:
    contacts: list[dict[str, str]] = []
    if not xml_text:
        return contacts
    try:
        root = ET.fromstring(xml_text.encode("utf-8"))
        for elem in root.iter():
            if elem.tag.rsplit("}", 1)[-1] != "Contact":
                continue
            row = {}
            for child in list(elem):
                row[child.tag.rsplit("}", 1)[-1]] = "".join(child.itertext()).strip()
            contacts.append(row)
    except ET.ParseError:
        return contacts
    return contacts


def get_contacts(client: BaroBillClient) -> tuple[list[dict[str, str]], dict[str, Any]]:
    resp = client.call(
        "GetCorpMemberContacts",
        {"CERTKEY": client.certkey, "CorpNum": client.corp_num, "CheckCorpNum": client.corp_num},
    )
    contacts = extract_contacts(resp.xml_text)
    public_contacts = [
        {
            "ID": mask_text(contact.get("ID", "")),
            "ContactName": mask_text(contact.get("ContactName", "")),
            "Grade": contact.get("Grade", ""),
            "Email": mask_text(contact.get("Email", "")),
        }
        for contact in contacts
    ]
    return contacts, {
        "method": "GetCorpMemberContacts",
        "httpStatus": resp.http_status,
        "elapsedMs": resp.elapsed_ms,
        "count": len(contacts),
        "contacts": public_contacts,
        "fault": extract_text(resp.xml_text, "faultstring"),
    }


def add_error_string(client: BaroBillClient, row: dict[str, Any]) -> dict[str, Any]:
    result = str(row.get("result") or "").strip()
    if not re.fullmatch(r"-?\d+", result) or int(result) >= 0:
        return row
    err = client.simple("GetErrString", {"CERTKEY": client.certkey, "ErrCode": int(result)})
    return {**row, "errString": err.get("result") or err.get("fault") or ""}


def run_preflight(client: BaroBillClient) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    rows.append(client.simple("Ping", {}))
    rows.append(
        client.simple(
            "CheckCorpIsMember",
            {"CERTKEY": client.certkey, "CorpNum": client.corp_num, "CheckCorpNum": client.corp_num},
        )
    )
    rows.append(add_error_string(client, client.simple("CheckCERTIsValid", {"CERTKEY": client.certkey, "CorpNum": client.corp_num})))
    rows.append(add_error_string(client, client.simple("GetBalanceCostAmount", {"CERTKEY": client.certkey, "CorpNum": client.corp_num})))
    _, contacts_row = get_contacts(client)
    rows.append(contacts_row)
    return rows


def issue_body(
    *,
    certkey: str,
    corp_num: str,
    mgt_key: str,
    invoice_no: str,
    buyer_corp_num: str,
    write_date: str,
    contact_id: str,
) -> str:
    supplier = {
        "ContactID": contact_id,
        "CorpNum": corp_num,
        "MgtNum": mgt_key,
        "CorpName": "프레스코21 테스트",
        "TaxRegID": "",
        "CEOName": "테스트대표",
        "Addr": "테스트 주소",
        "BizClass": "꽃공예 재료",
        "BizType": "도소매",
        "ContactName": "테스트담당자",
        "TEL": "",
        "HP": "",
        "Email": "test@example.com",
    }
    buyer = {
        "ContactID": "",
        "CorpNum": buyer_corp_num,
        "MgtNum": "",
        "CorpName": "테스트 공급받는자",
        "TaxRegID": "",
        "CEOName": "테스트대표",
        "Addr": "테스트 주소",
        "BizClass": "교육",
        "BizType": "서비스",
        "ContactName": "테스트수신자",
        "TEL": "",
        "HP": "",
        "Email": "buyer@example.com",
    }

    def party_xml(name: str, values: dict[str, Any]) -> str:
        inner = "".join(f"<{key}>{xml_escape(value)}</{key}>" for key, value in values.items())
        return f"<{name}>{inner}</{name}>"

    line_item = "".join(
        [
            "<TaxInvoiceTradeLineItem>",
            f"<PurchaseExpiry>{write_date}</PurchaseExpiry>",
            "<Name>테스트 품목</Name>",
            "<Information>EA</Information>",
            "<ChargeableUnit>1</ChargeableUnit>",
            "<UnitPrice>1100</UnitPrice>",
            "<Amount>1000</Amount>",
            "<Tax>100</Tax>",
            f"<Description>{xml_escape(invoice_no)}</Description>",
            "</TaxInvoiceTradeLineItem>",
        ]
    )
    return "".join(
        [
            f'<RegistAndIssueTaxInvoice xmlns="{NS}">',
            f"<CERTKEY>{xml_escape(certkey)}</CERTKEY>",
            f"<CorpNum>{xml_escape(corp_num)}</CorpNum>",
            "<Invoice>",
            "<InvoiceKey></InvoiceKey>",
            party_xml("InvoicerParty", supplier),
            party_xml("InvoiceeParty", buyer),
            party_xml("BrokerParty", {}),
            "<InvoiceeASPEmail>buyer@example.com</InvoiceeASPEmail>",
            "<IssueDirection>1</IssueDirection>",
            "<TaxInvoiceType>1</TaxInvoiceType>",
            "<TaxType>1</TaxType>",
            "<TaxCalcType>1</TaxCalcType>",
            "<PurposeType>2</PurposeType>",
            "<ModifyCode></ModifyCode><Kwon></Kwon><Ho></Ho><SerialNum></SerialNum>",
            "<Cash></Cash><ChkBill></ChkBill><Note></Note><Credit></Credit>",
            f"<WriteDate>{write_date}</WriteDate>",
            "<AmountTotal>1000</AmountTotal>",
            "<TaxTotal>100</TaxTotal>",
            "<TotalAmount>1100</TotalAmount>",
            f"<Remark1>{xml_escape(invoice_no)}</Remark1>",
            "<Remark2>pressco21 n8n smoke test</Remark2>",
            "<Remark3>test server only</Remark3>",
            f"<TaxInvoiceTradeLineItems>{line_item}</TaxInvoiceTradeLineItems>",
            "</Invoice>",
            "<SendSMS>false</SendSMS>",
            "<ForceIssue>false</ForceIssue>",
            "<MailTitle>프레스코21 테스트 전자세금계산서</MailTitle>",
            "</RegistAndIssueTaxInvoice>",
        ]
    )


def run_issue(client: BaroBillClient, buyer_corp_num: str, contact_id: str = "") -> dict[str, Any]:
    contacts, contacts_row = get_contacts(client)
    resolved_contact_id = (contact_id or "").strip() or next((contact.get("ID", "") for contact in contacts if contact.get("ID")), "")
    if not resolved_contact_id:
        return {"issueBlocked": True, "reason": "CONTACT_ID_REQUIRED", "contacts": contacts_row}
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=9)))
    invoice_no = "SMOKE-" + now.strftime("%Y%m%d-%H%M%S")
    mgt_key = local_mgt_key(invoice_no)
    write_date = now.strftime("%Y%m%d")
    check = client.simple("CheckMgtNumIsExists", {"CERTKEY": client.certkey, "CorpNum": client.corp_num, "MgtKey": mgt_key})
    body = issue_body(
        certkey=client.certkey,
        corp_num=client.corp_num,
        mgt_key=mgt_key,
        invoice_no=invoice_no,
        buyer_corp_num=digits_only(buyer_corp_num),
        write_date=write_date,
        contact_id=resolved_contact_id,
    )
    issue_resp = client.call_raw("RegistAndIssueTaxInvoice", body)
    issue_result = extract_text(issue_resp.xml_text, "RegistAndIssueTaxInvoiceResult")
    issue_fault = extract_text(issue_resp.xml_text, "faultstring")
    issue_err = ""
    if re.fullmatch(r"-?\d+", issue_result or "") and int(issue_result) < 0:
        issue_err = client.simple("GetErrString", {"CERTKEY": client.certkey, "ErrCode": int(issue_result)}).get("result") or ""
    status_resp = client.call(
        "GetTaxInvoiceStateEX",
        {"CERTKEY": client.certkey, "CorpNum": client.corp_num, "MgtKey": mgt_key},
    )
    return {
        "invoiceNo": invoice_no,
        "providerMgtKey": mgt_key,
        "contactIdUsed": mask_text(resolved_contact_id),
        "preflightMgtCheck": check,
        "issue": {
            "httpStatus": issue_resp.http_status,
            "elapsedMs": issue_resp.elapsed_ms,
            "result": issue_result,
            "fault": issue_fault,
            "errString": issue_err,
        },
        "status": {
            "httpStatus": status_resp.http_status,
            "elapsedMs": status_resp.elapsed_ms,
            "fault": extract_text(status_resp.xml_text, "faultstring"),
            "fields": extract_status(status_resp.xml_text),
        },
    }


def main() -> int:
    load_env_file()
    parser = argparse.ArgumentParser(description="BaroBill SOAP smoke test")
    parser.add_argument("--issue", action="store_true", help="Run test-server RegistAndIssueTaxInvoice after preflight")
    parser.add_argument("--service-url", default=os.environ.get("BAROBILL_SERVICE_TEST_URL", DEFAULT_TEST_URL))
    parser.add_argument("--buyer-corp-num", default=os.environ.get("BAROBILL_TEST_BUYER_CORP_NUM", "2150552221"))
    parser.add_argument("--contact-id", default=os.environ.get("BAROBILL_CONTACT_ID", ""))
    args = parser.parse_args()

    certkey = os.environ.get("BAROBILL_CERTKEY", "").strip()
    corp_num = os.environ.get("BAROBILL_CORP_NUM", "").strip()
    client = BaroBillClient(certkey=certkey, corp_num=corp_num, service_url=args.service_url)
    print(f"BaroBill SOAP smoke: service_url={client.service_url}, corp_num={client.corp_num}, certkey={mask_certkey(client.certkey)}")
    print("Preflight:")
    for row in run_preflight(client):
        print_result(row)
    if args.issue:
        print("Issue test:")
        print_result(run_issue(client, args.buyer_corp_num, args.contact_id))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BaroBillSmokeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
