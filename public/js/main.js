// public/js/main.js
jQuery(function() {
    // Subcategory management
    $('#addNewSubcategory').on("click",function() {
        $('#subcategoryForm').show();
    });

    $('#newSubcategoryForm').on("submit",function(e) {
        e.preventDefault();
        const formData = {
            name: $(this).find('input[name="name"]').val(),
            categoryId: $(this).find('input[name="categoryId"]').val()
        };
        $.post('/api/subcategories', formData, function() {
            location.reload();
        });
    });

    $('.edit-subcategory').on("click",function() {
        const card = $(this).closest('.subcategory-card');
        const id = card.data('id');
        const name = card.find('h3').text();
        
        card.html(`
            <form class="edit-subcategory-form">
                <input type="text" value="${name}" required>
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn cancel">Cancel</button>
            </form>
        `);
    });

    $(document).on('submit', '.edit-subcategory-form', function(e) {
        e.preventDefault();
        const card = $(this).closest('.subcategory-card');
        const id = card.data('id');
        const name = $(this).find('input').val();
        
        $.ajax({
            url: `/api/subcategories/${id}`,
            method: 'PUT',
            data: { name },
            success: function() {
                location.reload();
            }
        });
    });

    $('.delete-subcategory').on("click",function() {
        if (confirm('Are you sure you want to delete this subcategory?')) {
            const id = $(this).closest('.subcategory-card').data('id');
            $.ajax({
                url: `/api/subcategories/${id}`,
                method: 'DELETE',
                success: function() {
                    location.reload();
                }
            });
        }
    });

    // Solution management
    $('#addNewSolution').on("click",function() {
        $('#solutionForm').show();
    });

    $('#newSolutionForm').on("submit",function(e) {
        e.preventDefault();
        $.post('/api/solutions', $(this).serialize(), function() {
            location.reload();
        });
    });

    $('.edit-solution').on("click",function() {
        const item = $(this).closest('.solution-item');
        const content = item.find('.solution-content').text();
        
        item.html(`
            <form class="edit-solution-form">
                <textarea name ="content" required>${content}</textarea>
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn cancel">Cancel</button>
            </form>
        `);
    });

    $(document).on('submit', '.edit-solution-form', function(e) {
        e.preventDefault();
        const item = $(this).closest('.solution-item');
        const id = item.data('id');
        const content = $(this).find('textarea').val();
        
        $.ajax({
            url: `/api/solutions/${id}`,
            method: 'PUT',
            data: { content },
            success: function() {
                location.reload();
            }
        });
    });

    $('.delete-solution').on("click",function() {
        if (confirm('Are you sure you want to delete this solution?')) {
            const id = $(this).closest('.solution-item').data('id');
            $.ajax({
                url: `/api/solutions/${id}`,
                method: 'DELETE',
                success: function() {
                    location.reload();
                }
            });
        }
    });

    // Cancel buttons
    $(document).on('click', '.cancel', function() {
        location.reload();
    });
});
