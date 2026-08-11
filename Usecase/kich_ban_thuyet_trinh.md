# KỊCH BẢN THUYẾT TRÌNH ĐỒ ÁN TỐT NGHIỆP

**Đề tài:** Nghiên cứu ứng dụng kiến trúc Microservices và Trí tuệ nhân tạo xây dựng hệ thống quản lý và tạo sinh đề thi trắc nghiệm cho học sinh THPT.

---

## PHẦN 1: MỞ ĐẦU & CƠ SỞ LÝ THUYẾT

### Slide 1: Trang bìa
*   **Nội dung:** Tên đề tài, Giảng viên hướng dẫn, Sinh viên thực hiện.
*   **Lời thoại:**
    > "Kính chào quý thầy cô trong Hội đồng bảo vệ đồ án tốt nghiệp. Chúng em là nhóm sinh viên thực hiện đề tài: **'Nghiên cứu ứng dụng kiến trúc Microservices và Trí tuệ nhân tạo xây dựng hệ thống quản lý và tạo sinh đề thi trắc nghiệm cho học sinh THPT'**. Đồ án của chúng em được thực hiện dưới sự hướng dẫn khoa học của ThS. Nguyễn Hoàng Anh. Nhóm chúng em gồm 3 thành viên: Nguyễn Văn Chiến, Khuất Văn Vũ và Đào Hà Ngân. Hôm nay, chúng em rất vinh dự được trình bày kết quả nghiên cứu và sản phẩm của nhóm trước Hội đồng."
*   **Câu nối sang slide tiếp theo:**
    > *"Để thầy cô có cái nhìn tổng quan nhất về buổi bảo vệ hôm nay, em xin phép được đi vào phần tổng quan nội dung trình bày."*

---

### Slide 2: Tổng quan nội dung trình bày
*   **Nội dung:** 4 phần chính của bài thuyết trình.
*   **Lời thoại:**
    > "Nội dung báo cáo của chúng em hôm nay sẽ đi qua 4 phần chính: 
    > 1. Mở đầu và Cơ sở lý thuyết liên quan.
    > 2. Phân tích và Thiết kế chi tiết hệ thống.
    > 3. Cách thức tích hợp Trí tuệ nhân tạo (AI) vào bài toán tạo đề.
    > 4. Cuối cùng là kết quả triển khai thực tế, thử nghiệm và định hướng phát triển trong tương lai."
*   **Câu nối sang slide tiếp theo:**
    > *"Trước hết, chúng ta sẽ bắt đầu với phần 1 - Mở đầu để tìm hiểu lý do tại sao nhóm quyết định thực hiện đề tài này."*

---

### Slide 3: Đặt vấn đề & Lý do chọn đề tài
*   **Nội dung:** Thực trạng, nhu cầu và giải pháp đề xuất.
*   **Lời thoại:**
    > "Kính thưa thầy cô, trong bối cảnh chuyển đổi số giáo dục hiện nay, việc đánh giá năng lực học sinh THPT qua hình thức trắc nghiệm ngày càng phổ biến. Tuy nhiên, qua khảo sát thực tế, việc quản lý ngân hàng câu hỏi hiện vẫn mang tính thủ công, việc trộn đề và tạo sinh đề thi tốn nhiều thời gian và rất dễ xảy ra sai sót cơ học. Từ đó, nhu cầu cấp thiết là cần một hệ thống số hóa và tự động hóa quy trình đánh giá năng lực một cách toàn diện. Nhận thấy điều đó, nhóm chúng em đề xuất giải pháp ứng dụng công nghệ Microservices kết hợp với Trí tuệ nhân tạo (AI) nhằm tối ưu hóa triệt để bài toán này."
*   **Câu nối sang slide tiếp theo:**
    > *"Xuất phát từ thực trạng đó, nhóm đã đặt ra những mục tiêu cụ thể cho hệ thống của mình."*

---

### Slide 4: Mục tiêu hệ thống
*   **Nội dung:** Các mục tiêu chính của hệ thống.
*   **Lời thoại:**
    > "Hệ thống của chúng em hướng tới 3 mục tiêu lớn:
    > - Thứ nhất, xây dựng một ngân hàng câu hỏi được chuẩn hóa, phân loại sâu theo mức độ nhận thức và thành phần năng lực.
    > - Thứ hai, hỗ trợ giáo viên tạo đề thi tự động hoặc thủ công một cách nhanh chóng, sinh ra các mã đề hoán vị chuẩn xác và hỗ trợ học sinh thi trực tuyến.
    > - Thứ ba, tận dụng sức mạnh của AI trong việc tự động sinh câu hỏi mới và tạo đề thi bám sát theo ma trận kiến thức định sẵn."
*   **Câu nối sang slide tiếp theo:**
    > *"Để hiện thực hóa những mục tiêu này, chúng em đã lựa chọn những công nghệ hiện đại và phù hợp nhất."*

---

### Slide 5: Công nghệ & Nền tảng
*   **Nội dung:** Kiến trúc Microservices, FastAPI, React, TiDB/MySQL, Google Gemini.
*   **Lời thoại:**
    > "Về mặt công nghệ, hệ thống áp dụng kiến trúc **Microservices** giúp tăng tính chịu tải và khả năng mở rộng. Phía Backend được phát triển bằng ngôn ngữ Python với framework **FastAPI**, kết hợp Frontend là **React và TypeScript** để mang lại trải nghiệm UI/UX mượt mà. Về lưu trữ, chúng em ứng dụng hệ quản trị cơ sở dữ liệu phân tán **TiDB** kết hợp với **MySQL** để xử lý lượng dữ liệu lớn. Đặc biệt, lõi AI hỗ trợ sinh đề và câu hỏi dựa trên mô hình ngôn ngữ lớn **Google Gemini AI**."
*   **Câu nối sang slide tiếp theo:**
    > *"Sau khi đã xác định được nền tảng công nghệ, nhóm đã bắt tay vào phân tích và thiết kế chi tiết hệ thống, cụ thể như thế nào xin mời thầy cô cùng theo dõi ở phần 2."*

---

## PHẦN 2: PHÂN TÍCH & THIẾT KẾ HỆ THỐNG

### Slide 6: Kiến trúc hệ thống tổng thể
*   **Nội dung:** Mô hình Microservices, API Gateway, độc lập dịch vụ.
*   **Lời thoại:**
    > "Như thầy cô đang thấy trên màn hình, đây là sơ đồ **Kiến trúc hệ thống tổng thể**. Chúng em phân rã hệ thống thành các service độc lập như: Service quản lý User, Service Exams tạo đề, Service AI hỗ trợ sinh câu hỏi... Mọi yêu cầu từ phía Client đều được đi qua một chốt chặn duy nhất là **API Gateway** để thực hiện xác thực, điều phối luồng và đảm bảo an toàn cho toàn bộ hệ thống phía trong."
*   **Câu nối sang slide tiếp theo:**
    > *"Trong kiến trúc phân tán này, việc kiểm soát quyền truy cập của từng tác nhân là cực kỳ quan trọng."*

---

### Slide 7: Các tác nhân & Phân quyền (RBAC)
*   **Nội dung:** Các role chính và bảo mật JWT/RBAC.
*   **Lời thoại:**
    > "Để bảo vệ tài nguyên hệ thống, chúng em thiết kế mô hình phân quyền dựa trên vai trò - **RBAC**. Hệ thống chia ra 5 tác nhân chính gồm: Quản trị viên, Trưởng phòng giáo vụ, Tổ trưởng bộ môn, Giảng viên và Thí sinh. Cơ chế xác thực sử dụng mã Token **JWT** được đính kèm trong mỗi request gửi lên, đảm bảo mỗi người dùng chỉ có thể thực hiện đúng các chức năng thuộc phạm vi quyền hạn của mình."
*   **Câu nối sang slide tiếp theo:**
    > *"Khi các tác nhân đã được định danh rõ ràng, họ sẽ tham gia vào các luồng nghiệp vụ cốt lõi của hệ thống."*

---

### Slide 8: Quy trình nghiệp vụ cốt lõi
*   **Nội dung:** 5 bước nghiệp vụ chính của hệ thống.
*   **Lời thoại:**
    > "Quy trình nghiệp vụ của hệ thống được khép kín từ khâu đầu vào đến đầu ra: Đầu tiên, giảng viên sẽ soạn thảo và gửi duyệt câu hỏi. Tổ trưởng bộ môn tiến hành thẩm định câu hỏi để đưa vào ngân hàng. Khi cần kiểm tra, giáo viên thiết lập ma trận đề thi, hệ thống sẽ tự động bốc câu hỏi từ ngân hàng hoặc sinh mới bằng AI. Tiếp theo là bước trộn đề để tạo ra các mã đề hoán vị chuẩn xác và cuối cùng là tổ chức cho thí sinh thi trực tuyến."
*   **Câu nối sang slide tiếp theo:**
    > *"Để lưu trữ thông tin cho toàn bộ các bước nghiệp vụ phức tạp này, chúng em đã thiết kế cơ sở dữ liệu tương ứng."*

---

### Slide 9: Thiết kế Cơ sở dữ liệu (ERD)
*   **Nội dung:** Sơ đồ ERD tổng quát, tách biệt database cho từng service.
*   **Lời thoại:**
    > "Đây là biểu đồ thực thể liên kết (ERD) tổng quát của hệ thống. Để đảm bảo tính độc lập của kiến trúc Microservices, mỗi service cốt lõi sẽ sở hữu một cơ sở dữ liệu riêng biệt. Ví dụ cơ sở dữ liệu quản lý người dùng được tách rời khỏi cơ sở dữ liệu quản lý đề thi. Việc đồng bộ hoặc truy vấn chéo giữa các service được thực hiện thông qua các API nội bộ an toàn và nhanh chóng."
*   **Câu nối sang slide tiếp theo:**
    > *"Sau đây, chúng em xin phép trình bày chi tiết về giao diện và cách thức hoạt động thực tế của từng phân hệ, bắt đầu từ phân hệ Quản lý Ngân hàng câu hỏi."*

---

### Slide 10: Quản lý Ngân hàng câu hỏi
*   **Nội dung:** Phân loại câu hỏi sâu, giao diện quản lý.
*   **Lời thoại:**
    > "Trên màn hình là giao diện thực tế của chức năng Quản lý câu hỏi. Điểm nổi bật ở đây là câu hỏi không chỉ được lưu trữ thông thường mà còn được phân loại rất sâu. Chúng em phân loại theo: Cấp độ tư duy (từ Nhận biết đến Vận dụng cao), Thành phần năng lực học sinh, Khối lớp, Chủ đề kiến thức và cả định dạng câu hỏi. Hệ thống bộ lọc thông minh ở phía trên giúp giáo viên nhanh chóng tìm kiếm và sàng lọc chính xác câu hỏi mình cần chỉ trong vài giây."
*   **Câu nối sang slide tiếp theo:**
    > *"Tuy nhiên, để một câu hỏi được chính thức đưa vào ngân hàng và sử dụng trong đề thi, nó phải trải qua một quy trình kiểm duyệt nghiêm ngặt."*

---

### Slide 11: Quy trình Thẩm định câu hỏi
*   **Nội dung:** Luồng duyệt câu hỏi (Nháp -> Chờ duyệt -> Đã duyệt).
*   **Lời thoại:**
    > "Để đảm bảo chất lượng học thuật, chúng em xây dựng luồng thẩm định chặt chẽ. Khi giáo viên soạn thảo hoặc sinh câu hỏi từ AI, câu hỏi đó sẽ ở trạng thái 'Nháp' hoặc 'Chờ duyệt'. Chỉ khi Tổ trưởng bộ môn hoặc người kiểm duyệt có thẩm quyền phê duyệt câu hỏi đó đạt chuẩn kiến thức, câu hỏi mới chuyển sang trạng thái 'Đã duyệt' và sẵn sàng đưa vào các đề thi chính thức. Nếu bị từ chối, câu hỏi sẽ được trả về kèm lý do để người soạn chỉnh sửa."
*   **Câu nối sang slide tiếp theo:**
    > *"Một khi ngân hàng đã có nguồn câu hỏi chất lượng, bước tiếp theo của giáo viên sẽ là xây dựng ma trận đề thi."*

---

### Slide 12: Quản lý Ma trận đề thi
*   **Nội dung:** Cấu hình ma trận đề thi, phân bố câu hỏi và điểm số.
*   **Lời thoại:**
    > "Để tạo ra một đề thi chuẩn hóa, giáo viên sẽ sử dụng tính năng Thiết lập ma trận đề thi. Tại đây, giáo viên có thể cấu hình chi tiết: đề thi cần bao nhiêu câu thuộc chủ đề nào, tỷ lệ các câu Nhận biết, Thông hiểu, Vận dụng và Vận dụng cao là bao nhiêu, cũng như số điểm tương ứng cho từng nhóm. Cấu hình ma trận này đóng vai trò làm khung xương cốt lõi để hệ thống quét ngân hàng câu hỏi hoặc ra lệnh cho AI sinh đề."
*   **Câu nối sang slide tiếp theo:**
    > *"Từ ma trận đề thi này, hệ thống sẽ tiến hành tạo đề gốc và thực hiện quy trình trộn đề hoán vị."*

---

### Slide 13: Quản lý Đề gốc & Hoán vị Đề thi
*   **Nội dung:** Trộn sinh đề hoán vị, tạo gói đề và xuất file Word.
*   **Lời thoại:**
    > "Sau khi xác định được đề gốc (qua việc tự chọn hoặc tự động chọn câu hỏi bám sát ma trận), hệ thống sẽ kích hoạt thuật toán hoán vị câu hỏi và đáp án để tạo ra các mã đề khác nhau. Các mã đề này được nhóm lại thành một 'Gói đề'. Giáo viên có thể dễ dàng xuất toàn bộ gói đề thi này ra file Word có định dạng chuẩn hóa, sẵn sàng để in ấn và phát cho học sinh."
*   **Câu nối sang slide tiếp theo:**
    > *"Bên cạnh các nghiệp vụ quản lý truyền thống, điểm đột phá của đề tài nằm ở việc tích hợp Trí tuệ nhân tạo (AI) để tối ưu hóa quy trình. Em xin phép chuyển sang Phần 3 để làm rõ nội dung này."*

---

## PHẦN 3: TÍCH HỢP TRÍ TUỆ NHÂN TẠO - AI

### Slide 14: Mô hình AI & Kiến trúc tích hợp
*   **Nội dung:** Quy trình xử lý phía máy chủ khi tích hợp Google Gemini AI.
*   **Lời thoại:**
    > "Ở phần này, hệ thống của chúng em tích hợp trực tiếp với mô hình ngôn ngữ lớn **Google Gemini AI** thông qua API. Khi người dùng gửi yêu cầu sinh câu hỏi hoặc sinh đề, server Backend sẽ đảm nhận vai trò trung gian: chuẩn bị bối cảnh và hướng dẫn, gửi yêu cầu tới API của Gemini, nhận kết quả thô, sau đó phân tách dữ liệu dạng JSON để lưu trữ trực tiếp vào cơ sở dữ liệu mà không cần con người phải copy-paste thủ công."
*   **Câu nối sang slide tiếp theo:**
    > *"Để đảm bảo kết quả phản hồi từ AI luôn chuẩn xác và có cấu trúc dữ liệu tốt nhất, chúng em đã áp dụng kỹ thuật Prompt Engineering."*

---

### Slide 15: Kỹ thuật Prompt Engineering
*   **Nội dung:** Cấu trúc Prompt và ràng buộc đầu ra dạng JSON.
*   **Lời thoại:**
    > "Prompt Engineering là chìa khóa để kiểm soát chất lượng đầu ra của AI. Chúng em thiết kế các cấu trúc Prompt mẫu, định hình rõ vai trò của AI là một chuyên gia giáo dục THPT. Prompt yêu cầu rõ ràng về mặt kiến thức (chuẩn chương trình GDPT mới) và bắt buộc AI phải trả về định dạng JSON theo đúng cấu trúc Schema mà hệ thống định sẵn (bao gồm nội dung câu hỏi, các lựa chọn, đáp án đúng và lời giải chi tiết). Nhờ đó, tỷ lệ lỗi phân tích cú pháp (parse JSON) gần như bằng 0."
*   **Câu nối sang slide tiếp theo:**
    > *"Nhờ kỹ thuật Prompt chuẩn hóa này, tính năng sinh câu hỏi tự động của hệ thống hoạt động vô cùng hiệu quả."*

---

### Slide 16: AI - Sinh câu hỏi tự động
*   **Nội dung:** Sinh đa dạng các loại câu hỏi (trắc nghiệm, đúng/sai, trả lời ngắn). Giao diện thực tế.
*   **Lời thoại:**
    > "Đây là giao diện thực tế của tính năng Sinh câu hỏi bằng AI. Giáo viên chỉ cần nhập chủ đề mong muốn, chọn khối lớp, độ khó và số lượng câu hỏi cần sinh. Ngay lập tức, AI sẽ sinh ra các câu hỏi dưới nhiều định dạng khác nhau: từ trắc nghiệm một lựa chọn, trắc nghiệm Đúng/Sai, cho đến câu hỏi dạng trả lời ngắn. Giáo viên có thể duyệt nhanh, sửa trực tiếp trên giao diện trước khi lưu vào ngân hàng câu hỏi."
*   **Câu nối sang slide tiếp theo:**
    > *"Không chỉ dừng lại ở việc sinh các câu hỏi đơn lẻ, AI còn hỗ trợ đắc lực trong việc sinh cả một đề thi hoàn chỉnh."*

---

### Slide 17: AI - Sinh đề thi tự động theo Ma trận
*   **Nội dung:** AI tự động phân tích ma trận để tạo đề thi hoàn chỉnh.
*   **Lời thoại:**
    > "Với tính năng này, giáo viên chỉ cần cung cấp ma trận đề thi (như số câu dễ, câu khó của từng chủ đề). AI sẽ tự động phân tích cấu trúc ma trận, sau đó truy vấn ngân hàng câu hỏi kết hợp tự động sinh mới những câu hỏi còn thiếu để lấp đầy ma trận một cách logic nhất. Điều này giúp rút ngắn thời gian tạo ra một đề thi thử hay đề kiểm tra chất lượng từ vai tiếng xuống còn vài chục giây."
*   **Câu nối sang slide tiếp theo:**
    > *"Mặc dù AI mang lại hiệu suất rất cao, chúng em cũng đã đưa ra những đánh giá khách quan về hiệu quả và thách thức khi áp dụng công nghệ này."*

---

### Slide 18: Đánh giá hiệu quả của AI
*   **Nội dung:** Ưu điểm (tiết kiệm thời gian, đa dạng) & Nhược điểm (Hallucination, bắt buộc thẩm định).
*   **Lời thoại:**
    > "Qua thực tế thử nghiệm, việc ứng dụng AI giúp giảm tới 80% thời gian biên soạn đề thi của giáo viên và tạo ra ngân hàng câu hỏi vô cùng đa dạng, phong phú. Tuy nhiên, thách thức lớn nhất của LLM là hiện tượng 'Hallucination' - tức là AI có thể đưa ra đáp án không chính xác hoặc thông tin bịa đặt. Do đó, hệ thống của chúng em bắt buộc phải có bước 'Thẩm định câu hỏi' bởi tổ chuyên môn trước khi đưa đề thi vào sử dụng, đảm bảo tính chính xác tuyệt đối trong giáo dục."
*   **Câu nối sang slide tiếp theo:**
    > *"Sau khi đã xây dựng xong ngân hàng đề thi chuẩn hóa, hệ thống cung cấp một phân hệ cho phép học sinh làm bài thi trực tuyến để kiểm tra năng lực của mình."*

---

## PHẦN 4: TRIỂN KHAI, THỬ NGHIỆM & KẾT LUẬN

### Slide 19: Phân hệ Thi Trực tuyến
*   **Nội dung:** Giao diện làm bài của học sinh, bộ đếm ngược, tự động chấm điểm.
*   **Lời thoại:**
    > "Đây là giao diện làm bài thi trực tuyến dành cho học sinh. Học sinh có thể tham gia thi bằng các thiết bị máy tính hoặc điện thoại di động. Giao diện được thiết kế tối giản, tập trung vào câu hỏi, có đồng hồ đếm ngược thời gian thực. Ngay khi học sinh nộp bài hoặc hết giờ làm bài, hệ thống sẽ tự động chấm điểm, lưu kết quả và hiển thị đáp án cũng như lời giải chi tiết cho từng câu để học sinh tự đánh giá lỗ hổng kiến thức."
*   **Câu nối sang slide tiếp theo:**
    > *"Từ kết quả làm bài của học sinh và hoạt động của giáo viên, phân hệ Dashboard sẽ tổng hợp toàn bộ dữ liệu trực quan."*

---

### Slide 20: Kết quả vận hành & Thống kê
*   **Nội dung:** Hoàn thiện nghiệp vụ, trang Dashboard thống kê trực quan.
*   **Lời thoại:**
    > "Hệ thống đã được vận hành thử nghiệm và cho kết quả ổn định. Trang Dashboard dành cho Admin và Giáo vụ cung cấp các biểu đồ thống kê trực quan về: Số lượng câu hỏi theo môn học, số lượng đề thi đã tạo, biểu đồ phân bố điểm số của học sinh qua các kỳ thi. Những số liệu này giúp nhà trường và giáo viên nhanh chóng đánh giá được chất lượng dạy và học để có những điều chỉnh phù hợp."
*   **Câu nối sang slide tiếp theo:**
    > *"Nhìn lại chặng đường nghiên cứu và phát triển đề tài, nhóm chúng em cũng đúc rút được những hạn chế và hướng đi tiếp theo."*

---

### Slide 21: Hạn chế, Hướng phát triển & Lời cảm ơn
*   **Nội dung:** Hạn chế (API Gemini, chịu tải), Hướng phát triển (Load balancing, Local LLM), Lời cảm ơn.
*   **Lời thoại:**
    > "Mặc dù đạt được những kết quả khả quan, hệ thống vẫn còn một số hạn chế như: phụ thuộc vào tốc độ và giới hạn API của Google Gemini, cũng như cần tối ưu hóa hiệu năng chịu tải khi có hàng ngàn học sinh cùng thi một lúc. Hướng phát triển tiếp theo của nhóm là nghiên cứu tích hợp Load Balancing mạnh mẽ hơn và đặc biệt là fine-tune một mô hình ngôn ngữ lớn chạy nội bộ (Local LLM) để bảo mật dữ liệu và tiết kiệm chi phí API.
    > 
    > Kính thưa quý thầy cô trong Hội đồng, trên đây là toàn bộ phần trình bày về đồ án tốt nghiệp của nhóm chúng em. Chúng em xin chân thành cảm ơn sự lắng nghe của quý thầy cô và rất mong nhận được những ý kiến đóng góp, nhận xét để đề tài được hoàn thiện hơn. Chúng em xin trân trọng cảm ơn!"

---

## 💡 LƯU Ý DÀNH CHO NGƯỜI THUYẾT TRÌNH (TIPS)

1.  **Phân chia thời gian:** 
    *   **Phần 1** (Slide 1 - 5): Nói nhanh gọn, tập trung giới thiệu bối cảnh và công nghệ (khoảng 3 phút).
    *   **Phần 2** (Slide 6 - 13): Giải thích rõ luồng nghiệp vụ vì đây là phần Hội đồng rất quan tâm (khoảng 5 - 6 phút).
    *   **Phần 3** (Slide 14 - 18): Nhấn mạnh vào Prompt và giải pháp xử lý "Hallucination" (Hiện tượng AI bịa đáp án) vì đây là điểm mới, sáng tạo của đề tài (khoảng 3 - 4 phút).
    *   **Phần 4** (Slide 19 - 21): Trình bày kết quả thực tế, chạy demo hoặc chiếu slide chụp màn hình chạy ổn định (khoảng 2 phút).
2.  **Tương tác với Slide:** 
    *   Khi nói đến slide có hình vẽ hoặc screenshot hệ thống (ví dụ các Slide 6, 8, 9, 10, 12, 13, 16, 17, 19, 20), hãy dùng con trỏ laser hoặc chỉ tay trực tiếp vào hình ảnh để giải thích. Tránh đọc thuộc lòng chữ trên slide.
3.  **Tông giọng:** 
    *   Giữ thái độ tự tin, nói to, rõ ràng và mạch lạc. Đoạn chuyển slide (câu nối) nên nói chậm lại một chút để người nghe kịp chuyển sự chú ý theo màn hình.
