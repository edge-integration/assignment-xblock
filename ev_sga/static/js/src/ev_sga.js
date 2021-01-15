/* Javascript for EvGradedAssignment. */
function EvGradedAssignment(runtime, element) {
    function xblock($, _) {
        var submitAssignmentUrl = runtime.handlerUrl(element, 'submit_assignment');   //changed this to submit final answer
        var getStaffGradingUrl = runtime.handlerUrl(
          element, 'get_staff_grading_data'
        );
        var enterGradeUrl = runtime.handlerUrl(element, 'enter_grade');
        var removeGradeUrl = runtime.handlerUrl(element, 'remove_grade');
        var downloadSubmissionsUrl = runtime.handlerUrl(element, 'download_submissions');
        var prepareDownloadSubmissionsUrl = runtime.handlerUrl(element, 'prepare_download_submissions');
        var downloadSubmissionsStatusUrl = runtime.handlerUrl(element, 'download_submissions_status');
        var template = _.template($(element).find("#ega-tmpl").text());
        var gradingTemplate;
        var preparingSubmissionsMsg = gettext(
          'Started preparing student submissions zip file. This may take a while.'
        );

        function render(state) {
            state.error = state.error || false;

            // Render template
            var content = $(element).find('#ega-content').html(template(state));

            // submit answer here
            $(content).find('.submit-answer-button').on('click', function() {
                var form = $(element).find("#submit-answer-form");
                $.post(submitAssignmentUrl, form.serialize())
                    .success(
                        function (state) {
                            render(state);
                        }
                    ).fail(
                        function () {
                            state.error = gettext('Submission failed. Please contact your course instructor.');
                            render(state);
                        }
                    );
            });

        }

        function renderStaffGrading(data) {
            if (data.hasOwnProperty('error')) {
              gradeFormError(data['error']);
            } else {
              gradeFormError('');
              $('.grade-modal').hide();
            }

            if (data.display_name !== '') {
                $('.ega-block .display_name').html(data.display_name);
            }

            // Render template
            $(element).find('#grade-info')
                .html(gradingTemplate(data))
                .data(data);

            // Map data to table rows
            data.assignments.map(function(assignment) {
              $(element).find('#grade-info #row-' + assignment.module_id).data(assignment);
            });

            // Set up grade entry modal
            $(element).find('.enter-grade-button')
                .leanModal({closeButton: '#enter-grade-cancel'})
                .on('click', handleGradeEntry);

            $.tablesorter.addParser({
              id: 'alphanum',
              is: function(s) {
                return false;
              },
              format: function(s) {
                var str = s.replace(/(\d{1,2})/g, function(a){
                    return pad(a);
                });

                return str;
              },
              type: 'text'
            });

            $.tablesorter.addParser({
                id: 'yesno',
                is: function(s) {
                    return false;
                },
                format: function(s) {
                    return s.toLowerCase().trim() === gettext('yes') ? 1 : 0;
                },
                type: 'text'
            });

            function pad(num) {
              var s = '00000' + num;
              return s.substr(s.length-5);
            }
            $("#submissions").tablesorter({
                headers: {
                  2: { sorter: "alphanum" },
                  3: { sorter: "alphanum" },
                  4: { sorter: "yesno" },
                  7: { sorter: "alphanum" }
                }
            });
            $("#submissions").trigger("update");
            var sorting = [[4,1], [1,0]];
            $("#submissions").trigger("sorton",[sorting]);
        }

        function isStaff() {
          return $(element).find('.ega-block').attr('data-staff') === 'True';
        }

        /* Just show error on enter grade dialog */
        function gradeFormError(error) {
            var form = $(element).find("#enter-grade-form");
            form.find('.error').html(error);
        }

        /* Click event handler for "enter grade" */
        function handleGradeEntry() {
            var row = $(this).parents("tr");
            var form = $(element).find("#enter-grade-form");
            $(element).find('#student-name').text(row.data('fullname'));
            form.find('#module_id-input').val(row.data('module_id'));
            form.find('#submission_id-input').val(row.data('submission_id'));
            form.find('#grade-input').val(row.data('score'));
            form.find('#comment-input').text(row.data('comment'));
            form.off('submit').on('submit', function(event) {
                var max_score = row.parents('#grade-info').data('max_score');
                var score = Number(form.find('#grade-input').val());
                event.preventDefault();
                if (!score) {
                    $.post(enterGradeUrl, form.serialize())
                        .success(renderStaffGrading);
                    // gradeFormError('<br/>'+gettext('Grade must be a number.'));
                } else if (score !== parseInt(score)) {
                    gradeFormError('<br/>'+gettext('Grade must be an integer.'));
                } else if (score < 0) {
                    gradeFormError('<br/>'+gettext('Grade must be positive.'));
                } else if (score > max_score) {
                    gradeFormError('<br/>'+interpolate(gettext('Maximum score is %(max_score)s'), {max_score:max_score}, true));
                } else {
                    // No errors
                    $.post(enterGradeUrl, form.serialize())
                        .success(renderStaffGrading);
                }
            });
            form.find('#remove-grade').on('click', function(event) {
                var url = removeGradeUrl + '?module_id=' +
                    row.data('module_id') + '&student_id=' +
                    row.data('student_id');
                event.preventDefault();
                if (row.data('score')) {
                  // if there is no grade then it is pointless to call api.
                  $.get(url).success(renderStaffGrading);
                } else {
                    gradeFormError('<br/>'+gettext('No grade to remove.'));
                }
            });
            form.find('#enter-grade-cancel').on('click', function() {
                /* We're kind of stretching the limits of leanModal, here,
                 * by nesting modals one on top of the other.  One side effect
                 * is that when the enter grade modal is closed, it hides
                 * the overlay for itself and for the staff grading modal,
                 * so the overlay is no longer present to click on to close
                 * the staff grading modal.  Since leanModal uses a fade out
                 * time of 200ms to hide the overlay, our work around is to
                 * wait 225ms and then just "click" the 'Grade Submissions'
                 * button again.  It would also probably be pretty
                 * straightforward to submit a patch to leanModal so that it
                 * would work properly with nested modals.
                 *
                 * See: https://github.com/mitodl/edx-sga/issues/13
                 */
                setTimeout(function() {
                    $('#grade-submissions-button').click();
                    gradeFormError('');
                }, 225);
            });
        }


        $(function($) { // onLoad
            var block = $(element).find('.ega-block');
            var state = block.attr('data-state');
            var parsedState = JSON.parse(state);
            render(parsedState);

            var is_staff = isStaff();
            if (is_staff) {
                gradingTemplate = _.template(
                    $(element).find('#sga-grading-tmpl').text());
                block.find('#grade-submissions-button')
                    .leanModal()
                    .on('click', function() {
                        $.ajax({
                            url: getStaffGradingUrl,
                            success: renderStaffGrading
                        });
                    });
                block.find('#staff-debug-info-button')
                    .leanModal();

                $(element).find('#download-init-button').click(function(e) {
                  e.preventDefault();
                  var self = this;
                  $.get(prepareDownloadSubmissionsUrl).then(
                    function(data) {
                      if (data["downloadable"]) {
                        window.location = downloadSubmissionsUrl;
                        $(self).removeClass("disabled");
                      } else {
                        $(self).addClass("disabled");
                        $(element).find('.task-message')
                          .show()
                          .html(preparingSubmissionsMsg)
                          .removeClass("ready-msg")
                          .addClass("preparing-msg");
                        pollSubmissionDownload();
                      }
                    }
                  ).fail(
                    function() {
                      $(self).removeClass("disabled");
                      $(element).find('.task-message')
                        .show()
                        .html(
                          interpolate(
                            gettext(
                              'The download file was not created. Please try again or contact %(support_email)s'
                            ),
                            {support_email: $(element).find('.ega-block').attr("data-support-email")},
                            true
                          )
                        )
                        .removeClass("preparing-msg")
                        .addClass("ready-msg");
                    }
                  );
                });
            }
        });

        function pollSubmissionDownload() {
          pollUntilSuccess(downloadSubmissionsStatusUrl, checkResponse, 10000, 100).then(function() {
            $(element).find('#download-init-button').removeClass("disabled");
            $(element).find('.task-message')
              .show()
              .html(gettext("Student submission file ready for download"))
              .removeClass("preparing-msg")
              .addClass("ready-msg");
          }).fail(function() {
            $(element).find('#download-init-button').removeClass("disabled");
            $(element).find('.task-message')
              .show()
              .html(
                interpolate(
                  gettext(
                    'The download file was not created. Please try again or contact %(support_email)s'
                  ),
                  {support_email: $(element).find('.ega-block').attr("data-support-email")},
                  true
                )
              );
          });
        }
    }

    function checkResponse(response) {
      return response["zip_available"];
    }

    function pollUntilSuccess(url, checkSuccessFn, intervalMs, maxTries) {
      var deferred = $.Deferred(),
        tries = 1;

      function makeLoopingRequest() {
        $.get(url).success(function(response) {
          if (checkSuccessFn(response)) {
            deferred.resolve(response);
          } else if (tries < maxTries) {
            tries++;
            setTimeout(makeLoopingRequest, intervalMs);
          } else {
            deferred.reject('Max tries exceeded.');
          }
        }).fail(function(err) {
          deferred.reject('Request failed:\n' + err.responseText);
        });
      }
      makeLoopingRequest();

      return deferred.promise();
    }

    function loadjs(url) {
        $('<script>')
            .attr('type', 'text/javascript')
            .attr('src', url)
            .appendTo(element);
    }

    if (require === undefined) {
        /**
         * The LMS does not use require.js (although it loads it...) and
         * does not already load jquery.fileupload.  (It looks like it uses
         * jquery.ajaxfileupload instead.  But our XBlock uses
         * jquery.fileupload.
         */
        xblock($, _);
    } else {
        /**
         * Studio, on the other hand, uses require.js and already knows about
         * jquery.fileupload.
         */
        require(['jquery', 'underscore', 'jquery.fileupload'], xblock);
    }
}
