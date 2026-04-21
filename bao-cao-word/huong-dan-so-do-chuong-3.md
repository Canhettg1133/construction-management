# Huong dan ve so do Chuong 3

Tai lieu nay gom:
- Vi tri chen tung hinh trong Word.
- Ten hinh de dung voi `Insert Caption`.
- Ma Mermaid de dan vao `https://mermaid.live/`.

## Cach dung

- Mo `https://mermaid.live/`
- Xoa doan ma mau co san
- Dan doan code Mermaid cua hinh can ve
- Chon `Actions` -> `Export` -> `PNG` hoac `SVG`
- Chen anh vao Word tai dung vi tri da ghi ben duoi
- Click vao anh trong Word
- Vao `References` -> `Insert Caption`
- Tao nhan `Hinh` neu Word chua co
- Chon `Position`: `Below selected item`
- Sua caption theo dung mau:
  + `Hinh 3.2.1: Kien truc tong the he thong`
  + `Hinh 3.7.6: So do Use Case chuc nang quan ly an toan`

## Hinh 3.2.1

- Ten hinh:
  + `Hinh 3.2.1: Kien truc tong the he thong`
- Loai hinh:
  + So do khoi kien truc he thong
- Vi tri chen:
  + Chen ngay sau muc `3.2.1 Kien truc tong the he thong`
  + Cu the la sau doan mo ta frontend, backend, Prisma, MySQL va cac thanh phan ho tro

```mermaid
flowchart LR
    U[Nguoi dung] --> FE[Frontend Web<br/>React + Vite + TypeScript]
    FE -->|HTTP/HTTPS + Cookie| BE[Backend API<br/>Express + TypeScript]
    BE --> ORM[Prisma ORM]
    ORM --> DB[(MySQL Database)]

    BE --> FS[Luu tru tep tin / hinh anh]
    BE --> AU[Audit log]
    BE --> NO[Notification]

    subgraph CLIENT[Phia nguoi dung]
        U
        FE
    end

    subgraph SERVER[Phia may chu]
        BE
        ORM
        AU
        NO
    end

    subgraph DATA[Tang du lieu]
        DB
        FS
    end
```

## Hinh 3.2.2

- Ten hinh:
  + `Hinh 3.2.2: So do Use Case tong quat cua he thong`
- Loai hinh:
  + So do Use Case tong quat
- Vi tri chen:
  + Chen ngay sau muc `3.2.4 So do Use Case tong quat`

```mermaid
flowchart TB
    Admin[Quan tri vien]
    PM[Truong du an]
    Engineer[Ky su cong truong]
    Safety[Can bo an toan]
    Quality[Can bo chat luong]
    Warehouse[Thu kho]
    Client[Chu dau tu / Giam sat]

    UC1((Dang nhap))
    UC2((Quan ly nguoi dung))
    UC3((Quan ly du an))
    UC4((Quan ly thanh vien))
    UC5((Quan ly cong viec))
    UC6((Bao cao ngay))
    UC7((Tai lieu va tep tin))
    UC8((Quan ly an toan))
    UC9((Quan ly chat luong))
    UC10((Quan ly kho vat tu))
    UC11((Quan ly ngan sach))
    UC12((Phe duyet))
    UC13((Dashboard va thong bao))
    UC14((Nhat ky he thong))

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC13
    Admin --> UC14

    PM --> UC1
    PM --> UC3
    PM --> UC4
    PM --> UC5
    PM --> UC6
    PM --> UC7
    PM --> UC10
    PM --> UC11
    PM --> UC12
    PM --> UC13

    Engineer --> UC1
    Engineer --> UC5
    Engineer --> UC6
    Engineer --> UC7
    Engineer --> UC13

    Safety --> UC1
    Safety --> UC8
    Safety --> UC12
    Safety --> UC13

    Quality --> UC1
    Quality --> UC9
    Quality --> UC12
    Quality --> UC13

    Warehouse --> UC1
    Warehouse --> UC10
    Warehouse --> UC13

    Client --> UC1
    Client --> UC3
    Client --> UC6
    Client --> UC9
    Client --> UC13
```

## Hinh 3.4.1

- Ten hinh:
  + `Hinh 3.4.1: Mo hinh phan quyen hai cap cua he thong`
- Loai hinh:
  + So do phan cap quyen
- Vi tri chen:
  + Chen ngay sau muc `3.4.1 Mo hinh phan quyen hai cap`

```mermaid
flowchart TD
    U[Nguoi dung] --> SR[Quyen cap cong ty<br/>System Role]
    U --> PR[Quyen cap du an<br/>Project Role]
    U --> TP[Quyen theo phan he<br/>Tool Permission]
    U --> SP[Quyen dac biet<br/>Special Privilege]

    SR --> A1[ADMIN]
    SR --> A2[STAFF]

    PR --> B1[PROJECT_MANAGER]
    PR --> B2[ENGINEER]
    PR --> B3[SAFETY_OFFICER]
    PR --> B4[DESIGN_ENGINEER]
    PR --> B5[QUALITY_MANAGER]
    PR --> B6[WAREHOUSE_KEEPER]
    PR --> B7[CLIENT]
    PR --> B8[VIEWER]

    TP --> C1[PROJECT]
    TP --> C2[TASK]
    TP --> C3[DAILY_REPORT]
    TP --> C4[FILE]
    TP --> C5[DOCUMENT]
    TP --> C6[SAFETY]
    TP --> C7[QUALITY]
    TP --> C8[WAREHOUSE]
    TP --> C9[BUDGET]

    SP --> D1[SAFETY_SIGNER]
    SP --> D2[QUALITY_SIGNER]
    SP --> D3[BUDGET_APPROVER]
```

## Hinh 3.4.2

- Ten hinh:
  + `Hinh 3.4.2: Luong xac thuc va quan ly phien dang nhap`
- Loai hinh:
  + So do trinh tu / sequence diagram
- Vi tri chen:
  + Chen ngay sau muc `3.4.2 Xac thuc va quan ly phien dang nhap`

```mermaid
sequenceDiagram
    participant U as Nguoi dung
    participant FE as Frontend
    participant BE as Backend API
    participant DB as Database

    U->>FE: Nhap email va mat khau
    FE->>BE: Gui yeu cau dang nhap
    BE->>DB: Kiem tra tai khoan
    DB-->>BE: Tra thong tin nguoi dung
    BE-->>FE: Tra access token + refresh token qua cookie
    FE-->>U: Dang nhap thanh cong

    U->>FE: Mo lai he thong
    FE->>BE: Goi /auth/me
    BE->>BE: Kiem tra access token trong cookie
    BE-->>FE: Tra thong tin nguoi dung hien tai
    FE-->>U: Khoi phuc phien dang nhap
```

## Hinh 3.7.1

- Ten hinh:
  + `Hinh 3.7.1: So do Use Case chuc nang dang nhap he thong`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.1 Chuc nang dang nhap he thong`

```mermaid
flowchart LR
    User[Nguoi dung] --> UC1((Dang nhap))
    User --> UC2((Doi mat khau))
    User --> UC3((Quen mat khau))
    User --> UC4((Khoi phuc phien dang nhap))
```

## Hinh 3.7.2

- Ten hinh:
  + `Hinh 3.7.2: So do Use Case chuc nang quan ly du an`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.2 Chuc nang quan ly du an`

```mermaid
flowchart LR
    Admin[Quan tri vien]
    PM[Truong du an]
    Client[Chu dau tu / Giam sat]

    UC1((Xem danh sach du an))
    UC2((Xem chi tiet du an))
    UC3((Tao du an))
    UC4((Cap nhat du an))
    UC5((Theo doi tien do du an))

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    PM --> UC1
    PM --> UC2
    PM --> UC4
    PM --> UC5
    Client --> UC1
    Client --> UC2
```

## Hinh 3.7.3

- Ten hinh:
  + `Hinh 3.7.3: So do Use Case chuc nang quan ly cong viec`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.3 Chuc nang quan ly cong viec`

```mermaid
flowchart LR
    PM[Truong du an]
    Engineer[Ky su]
    Safety[Can bo an toan]
    Quality[Can bo chat luong]

    UC1((Tao cong viec))
    UC2((Cap nhat cong viec))
    UC3((Cap nhat trang thai))
    UC4((Binh luan cong viec))
    UC5((Gui phe duyet))
    UC6((Xem danh sach cong viec))
    UC7((Xem chi tiet cong viec))

    PM --> UC1
    PM --> UC2
    PM --> UC3
    PM --> UC4
    PM --> UC5
    PM --> UC6
    PM --> UC7

    Engineer --> UC2
    Engineer --> UC3
    Engineer --> UC4
    Engineer --> UC6
    Engineer --> UC7

    Safety --> UC3
    Safety --> UC4
    Safety --> UC6

    Quality --> UC3
    Quality --> UC4
    Quality --> UC6
```

## Hinh 3.7.4

- Ten hinh:
  + `Hinh 3.7.4: So do Use Case chuc nang bao cao ngay`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.4 Chuc nang bao cao ngay`

```mermaid
flowchart LR
    Engineer[Ky su cong truong]
    PM[Truong du an]
    Client[Chu dau tu / Giam sat]

    UC1((Tao bao cao ngay))
    UC2((Cap nhat bao cao))
    UC3((Dinh kem hinh anh))
    UC4((Gui phe duyet))
    UC5((Xem danh sach bao cao))
    UC6((Xem chi tiet bao cao))

    Engineer --> UC1
    Engineer --> UC2
    Engineer --> UC3
    Engineer --> UC4
    Engineer --> UC5
    Engineer --> UC6

    PM --> UC5
    PM --> UC6
    Client --> UC5
    Client --> UC6
```

## Hinh 3.7.5

- Ten hinh:
  + `Hinh 3.7.5: So do Use Case chuc nang quan ly tai lieu va tep tin`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.5 Chuc nang quan ly tai lieu va tep tin`

```mermaid
flowchart LR
    PM[Truong du an]
    Engineer[Ky su]
    Designer[Ky su thiet ke]
    Quality[Can bo chat luong]

    UC1((Tai tep len))
    UC2((Tao thu muc))
    UC3((Xem tai lieu))
    UC4((Tim kiem tai lieu))
    UC5((Quan ly phien ban))
    UC6((Xoa hoac an tep))

    PM --> UC1
    PM --> UC2
    PM --> UC3
    PM --> UC4
    PM --> UC5
    PM --> UC6

    Engineer --> UC1
    Engineer --> UC3
    Engineer --> UC4

    Designer --> UC1
    Designer --> UC3
    Designer --> UC5

    Quality --> UC3
    Quality --> UC4
```

## Hinh 3.7.6

- Ten hinh:
  + `Hinh 3.7.6: So do Use Case chuc nang quan ly an toan`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.6 Chuc nang quan ly an toan`

```mermaid
flowchart LR
    Safety[Can bo an toan]
    PM[Truong du an]

    UC1((Tao bao cao an toan))
    UC2((Ghi nhan checklist))
    UC3((Ghi nhan vi pham))
    UC4((Ghi nhan incident))
    UC5((Ghi nhan near miss))
    UC6((Tao hanh dong khac phuc))
    UC7((Xem dashboard an toan))
    UC8((Phe duyet bao cao an toan))

    Safety --> UC1
    Safety --> UC2
    Safety --> UC3
    Safety --> UC4
    Safety --> UC5
    Safety --> UC6
    Safety --> UC7

    PM --> UC7
    PM --> UC8
```

## Hinh 3.7.7

- Ten hinh:
  + `Hinh 3.7.7: So do Use Case chuc nang quan ly chat luong`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.7 Chuc nang quan ly chat luong`



## Hinh 3.7.8

- Ten hinh:
  + `Hinh 3.7.8: So do Use Case chuc nang quan ly kho vat tu`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.8 Chuc nang quan ly kho vat tu`

```mermaid
flowchart LR
    Warehouse[Thu kho]
    PM[Truong du an]

    UC1((Quan ly danh muc vat tu))
    UC2((Nhap kho))
    UC3((Xuat kho))
    UC4((Tao yeu cau vat tu))
    UC5((Xem ton kho))
    UC6((Xem lich su giao dich))
    UC7((Theo doi canh bao thieu vat tu))

    Warehouse --> UC1
    Warehouse --> UC2
    Warehouse --> UC3
    Warehouse --> UC4
    Warehouse --> UC5
    Warehouse --> UC6
    Warehouse --> UC7

    PM --> UC5
    PM --> UC6
    PM --> UC7
```

## Hinh 3.7.9

- Ten hinh:
  + `Hinh 3.7.9: So do Use Case chuc nang quan ly ngan sach va phe duyet`
- Loai hinh:
  + So do Use Case
- Vi tri chen:
  + Chen ngay sau muc `3.7.9 Chuc nang quan ly ngan sach va phe duyet`

```mermaid
flowchart LR
    PM[Truong du an]
    Approver[Nguoi phe duyet]
    Admin[Quan tri vien]

    UC1((Tao khoan muc ngan sach))
    UC2((Cap nhat du toan))
    UC3((Theo doi chi phi da su dung))
    UC4((Tao yeu cau giai ngan))
    UC5((Phe duyet hoac tu choi))
    UC6((Xem danh sach cho duyet))
    UC7((Theo doi tong quan ngan sach))

    PM --> UC1
    PM --> UC2
    PM --> UC3
    PM --> UC4
    PM --> UC7

    Approver --> UC5
    Approver --> UC6

    Admin --> UC6
    Admin --> UC7
```

## Hinh 3.8.1

- Ten hinh:
  + `Hinh 3.8.1: Bieu do co so du lieu quan he`
- Loai hinh:
  + ERD / so do quan he du lieu
- Vi tri chen:
  + Chen ngay sau muc `3.8 Bieu do co so du lieu quan he`

```mermaid
erDiagram
    USER ||--o{ PROJECT_MEMBER : tham_gia
    PROJECT ||--o{ PROJECT_MEMBER : co
    USER ||--o{ PROJECT : tao
    PROJECT ||--o{ DAILY_REPORT : co
    USER ||--o{ DAILY_REPORT : lap
    PROJECT ||--o{ TASK : co
    USER ||--o{ TASK : duoc_giao
    TASK ||--o{ TASK_COMMENT : co
    PROJECT ||--o{ PROJECT_FILE : co
    PROJECT ||--o{ DOCUMENT_FOLDER : co
    PROJECT ||--o{ SAFETY_REPORT : co
    PROJECT ||--o{ QUALITY_REPORT : co
    PROJECT ||--o{ WAREHOUSE_INVENTORY : co
    WAREHOUSE_INVENTORY ||--o{ WAREHOUSE_TRANSACTION : phat_sinh
    PROJECT ||--o{ BUDGET_ITEM : co
    BUDGET_ITEM ||--o{ BUDGET_DISBURSEMENT : giai_ngan
    USER ||--o{ NOTIFICATION : nhan
    USER ||--o{ AUDIT_LOG : tao

    USER {
      string id
      string name
      string email
      string systemRole
    }
    PROJECT {
      string id
      string code
      string name
      string location
      string status
    }
    TASK {
      string id
      string title
      string status
      string priority
    }
    DAILY_REPORT {
      string id
      date reportDate
      string weather
      int workerCount
    }
```

## Hinh 3.9.1

- Ten hinh:
  + `Hinh 3.9.1: Bieu do trien khai he thong`
- Loai hinh:
  + Deployment diagram / so do trien khai
- Vi tri chen:
  + Chen ngay sau muc `3.9 Bieu do trien khai he thong`

```mermaid
flowchart TB
    UserDevice[Thiet bi nguoi dung<br/>PC / Laptop / Trinh duyet]
    Frontend[Web App<br/>React + Vite]
    ApiServer[API Server<br/>Express + TypeScript]
    Database[(MySQL Database)]
    FileStore[Kho luu tru tep]
    Mail[Mail Service]

    UserDevice --> Frontend
    Frontend -->|API Request + Cookie| ApiServer
    ApiServer --> Database
    ApiServer --> FileStore
    ApiServer --> Mail
```

## Tong hop vi tri chen trong Word

- Sau muc `3.2.1` chen `Hinh 3.2.1`
- Sau muc `3.2.4` chen `Hinh 3.2.2`
- Sau muc `3.4.1` chen `Hinh 3.4.1`
- Sau muc `3.4.2` chen `Hinh 3.4.2`
- Sau muc `3.7.1` chen `Hinh 3.7.1`
- Sau muc `3.7.2` chen `Hinh 3.7.2`
- Sau muc `3.7.3` chen `Hinh 3.7.3`
- Sau muc `3.7.4` chen `Hinh 3.7.4`
- Sau muc `3.7.5` chen `Hinh 3.7.5`
- Sau muc `3.7.6` chen `Hinh 3.7.6`
- Sau muc `3.7.7` chen `Hinh 3.7.7`
- Sau muc `3.7.8` chen `Hinh 3.7.8`
- Sau muc `3.7.9` chen `Hinh 3.7.9`
- Sau muc `3.8` chen `Hinh 3.8.1`
- Sau muc `3.9` chen `Hinh 3.9.1`
