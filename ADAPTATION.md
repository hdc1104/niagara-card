# Home Assistant 카드 변경 고지

원본: Copyright (c) 2026 hdc1104, [niagara-humidifer](https://github.com/hdc1104/niagara-humidifer).

`reference-style.css`는 원본 `style.css`를 복사했습니다. `niagara-card.js`는 원본의 화면 구성과 스타일을 Home Assistant 카드로 적용한 수정 구현입니다. 원본의 브라우저 Bluetooth 코드는 사용하지 않으며 HA 엔티티와 서비스로 통신합니다. 브라우저별 연결 안내 대신 HA 연결 정보와 진단을 표시합니다. 예약은 수신된 설정 시간만 표시합니다. 목표습도 프리셋 40/45/50/55/60%는 원본 `protocol.js`의 대응표를 따릅니다.

이 디렉터리의 원본 및 수정 구현에는 함께 배포한 `LICENSE`의 비상업적 이용 조건이 적용됩니다. `THIRD_PARTY_NOTICES.md`도 함께 확인하세요.
