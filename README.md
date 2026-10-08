# Thanh Loan — quà 20/10

Toàn bộ web nằm trong folder thanh-loan, hoạt động độc lập. Chủ đề ngày Phụ nữ Việt Nam với hộp quà, nhân vật 3D, thiệp chúc, bó hoa và icon rơi mở ảnh theo thứ tự.

## Chạy thử

Nhấp đôi START.bat, hoặc chạy npm start trong folder này rồi mở http://127.0.0.1:5176/. Port riêng giúp mở cùng các bản quà khác. Chạy npm run check để kiểm tra cú pháp.

## Thay nội dung

- config.js: tên, lời chúc, lời nhắn ảnh và thông số mô hình.
- assets/a1.jpg đến a5.jpg: ảnh giữ nguyên từ thao-anh.
- assets/character.glb: mô hình giữ nguyên từ thao-anh.
- assets/a.mp3: nhạc mẫu giữ nguyên; thay file nếu muốn đổi nhạc.
- assets/bouquet.svg và sprig.svg: bó hoa và cành hoa trang trí.
- styles.css: màu sắc và biến --radius:20px cho các khung và nút.

Hướng dẫn chạm icon là một dòng chữ nhỏ 12px, in nghiêng màu đỏ ngay trong thiệp chúc. Chỉ bấm icon rơi mới mở ảnh, ảnh đã mở mới hiện ở bên dưới. Gói quà lại sẽ xóa các ảnh đã mở và đặt lại trạng thái bó hoa.

## GitHub Pages

Upload nguyên folder thanh-loan vào gốc repo, cùng cấp với anh-ruong và thao-anh. Đường dẫn sau khi GitHub Pages deploy:
https://saonumi2.github.io/20-10-2006/thanh-loan/

Không cần build. Font, thư viện và giấy phép đều có trong assets.
