# Niagara Humidifier Card

Niagara 가습기의 온도·습도·물량과 운전 모드·목표습도·예약을 표시하는 이동 가능한 Home Assistant 카드입니다. [Niagara 웹앱](https://github.com/hdc1104/niagara-humidifer)의 청록색 UI를 적용했습니다.

Bluetooth 연결은 [Niagara BLE 통합](https://github.com/hdc1104/ha-niagara-ble)이 처리합니다. 이 카드는 휴대폰의 Web Bluetooth나 브라우저 기기 권한을 사용하지 않습니다.

## 설치

1. Niagara BLE 통합을 설치해 장치를 등록합니다.
2. HACS → 사용자 지정 저장소에 `https://github.com/hdc1104/niagara-card`를 **Dashboard** 유형으로 추가합니다.
3. 베타/시험판 표시를 켜고 `0.2.0b1`을 다운로드한 뒤 브라우저를 새로 고칩니다.
4. 원하는 대시보드에서 **편집 → 카드 추가 → Niagara 가습기**를 선택합니다. YAML 전용 대시보드라면 YAML에 직접 추가하거나 UI 편집 가능한 대시보드를 사용하세요.

리소스가 자동 등록되지 않은 경우 **설정 → 대시보드 → 리소스**에 `/hacsfiles/niagara-card/niagara-card.js`를 **JavaScript 모듈**로 추가합니다. 별도 CSS 파일은 필요 없습니다.

## 설정

가습기가 한 대이면 자동 선택합니다.

```yaml
type: custom:niagara-card
title: Niagara
```

여러 대이면 카드 편집기의 **가습기 선택**에서 장치를 선택하세요. YAML에서는 기기의 운전 모드 엔티티 ID에서 `select.`와 끝의 `_mode`를 제외한 값을 지정합니다.

```yaml
type: custom:niagara-card
title: 거실 가습기
entity_prefix: niagara_abcd
```

예시 `abcd`는 자신의 엔티티 접두사로 바꾸세요. 엔티티 ID를 개별적으로 변경했다면 기본 접두사를 쓰는 엔티티들과 맞춰야 합니다. 한 카드의 설정이 다른 카드의 기기 선택에 영향을 주지 않습니다.

## 사용

- 운전 모드에서 정지·1~6단계·자동·필터 건조를 선택합니다.
- 목표습도를 클릭하고 40~60% 중 하나를 선택하면 즉시 전송합니다. 다음 설정이나 적용 버튼이 필요 없습니다.
- 예약은 0~12시간입니다. 0은 예약 해제입니다. 남은 시간으로 추측하지 않습니다.
- 연결 해제는 가습 운전을 중단하지 않습니다. 운전을 멈추려면 운전 모드에서 정지를 선택합니다.
- 미수신 측정값은 `—`로 표시합니다. 표시값은 실제 알림이며, 명령 ACK만으로 새 측정값을 채우지 않습니다.

원하는 대시보드의 편집 화면에서 카드를 이동할 수 있습니다. 공간 배정은 HA 기기 설정에서 별도로 지정합니다.

## 기존 수동 카드에서 전환

HACS 설치 후 기존 `/local/niagara/niagara-card.js?...` 리소스 등록을 삭제하고 HACS 리소스 하나만 유지하세요. 두 버전을 동시에 로드하면 먼저 등록된 코드가 남을 수 있습니다. 기존 `type: custom:niagara-card`와 `entity_prefix`는 계속 사용할 수 있습니다. 브라우저 캐시를 새로 고치세요.

## 수동 설치

릴리스의 `niagara-card.js`를 HA 설정 폴더의 `www/niagara-card.js`로 복사합니다. 리소스 URL은 `/local/niagara-card.js?v=0.2.0b1`, 유형은 JavaScript 모듈입니다. HACS 설치와 수동 리소스 등록을 중복하지 마세요.

## 개발

`src/`를 수정하고 `python3 tools/build.py`로 단일 `dist/niagara-card.js`를 생성합니다. Python 3.11+과 Chrome/Chromium이 있으면 `python3 tools/check_browser.py`로 서비스 호출·자동 장치 선택·미수신·오류 처리를 모의 검증합니다. 미리보기의 숫자는 모의 데이터입니다. 실제 하드웨어를 제어하는 테스트가 아닙니다.

## 권리 고지

Copyright (c) 2026 hdc1104. 원본과 수정 코드에 대한 비상업적 이용 조건은 [LICENSE](LICENSE)에 있습니다. 수정 내용은 [ADAPTATION.md](ADAPTATION.md), 제3자 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
