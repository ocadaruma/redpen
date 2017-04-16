/**
 * redpen: a text inspection tool
 * Copyright (c) 2014-2015 Recruit Technologies Co., Ltd. and contributors
 * (see CONTRIBUTORS.md)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 * redpen-ui.js - javascript RedPen UI support
 *
 */

var RedPenUI = RedPenUI || {};
RedPenUI.Utils = RedPenUI.Utils || {};

// ensure the language autodetect doesn't override the user's selection
RedPenUI.permitLanguageAutoDetect = true;

// store validator configuration for each language (HTML block)
RedPenUI.validatorConfigBlocks = {};

// store symbol setting for each language (HTML block)
RedPenUI.symbolTableBlocks = {};

// configuration object
RedPenUI.currentConfiguration = null;

// debouncer for user input
RedPenUI.validateTimeout = 0;

// sample documents
RedPenUI.sampleDocuments = {};

// clear editor and results
RedPenUI.clearResult = function() {
    $('#redpen-editor').val('').trigger("input");
};

RedPenUI.setView = function(view) {
    var newView = $("#redpen-view-" + view);
    if (!$(newView).is(":visible")) {
        $(".main").filter(":visible").slideUp(500, function () {
            $(newView).hide().slideDown();
        });
    }
};

// paste some sample text into the editor and trigger a change
RedPenUI.pasteSampleText = function(key) {
    RedPenUI.setView("validator");
    var text;
    if (RedPenUI.sampleDocuments[key]) {
        RedPenUI.permitLanguageAutoDetect = true;
        text = RedPenUI.sampleDocuments[key].document;
        $("#redpen-document-parser").val(RedPenUI.sampleDocuments[key].parser);
        $('#redpen-errors').empty();
    } else {
        console.error("No sample text for " + key + "...")
    }
    $("#redpen-editor")
        .val(text ? text : "")
        .trigger("input")
        .prop("disabled", false)
        .prop("placeholder", "Please type or paste some text here...");
};

RedPenUI.Utils.setEditPosition = function (error) {
    if (!error.position || !error.position.end) { return;  }
    var tarea = $('#redpen-editor')[0];
    if (!tarea.setSelectionRange) { return; }

    var text = $('#redpen-editor').val();
    var line = 1;
    var offset = 0;
    var characterPosition = 0;
    for (var i = 0; i < text.length; i++) {
        if ((line >= error.position.end.line) && (offset >= error.position.end.offset)) {
            characterPosition = i;
            break;
        }
        offset++;
        if (text[i] == "\n") {
            line++;
            offset = 0;
        }
    }
    tarea.focus();
    tarea.setSelectionRange(characterPosition, characterPosition);
};

// call RedPen to tokenize the document return the tokens
RedPenUI.Utils.tokenizeDocument = function (text, lang, callback) {
    redpen.tokenize(
        {
            document: text,
            lang: lang ? lang : "en"
        },
        function (result) {
            if (callback && result.tokens) {
                callback(result.tokens);
            }
        }
    );
};

RedPenUI.Utils.updateTokens = function() {
    var selected = $("input[type='radio'][name='redpen-token-lang']:checked");
    var lang = "en";
    if (selected.length > 0) {
        lang = selected.val();
    }
    RedPenUI.Utils.tokenizeDocument($("#redpen-token-editor").val(), lang, function (tokens) {
        var tokenStream = $("<div/>").addClass("nikkeib2b-token-stream");
        for (var i = 0; i < tokens.length; i++) {
            var tokenText = tokens[i].substr(13, tokens[i].length - 14);
            $(tokenStream).append(
                $("<div/>")
                    .addClass("nikkeib2b-token")
                    .append(tokenText)
            );
        }
        $("#redpen-token-output").empty().append(tokenStream);
    });
};

// return the current configuration
RedPenUI.Utils.getConfiguration = function(lang, activeValidatorNames) { // NOTE: properties are stored in currentConfiguration
    var validators = {};
    $.each(activeValidatorNames, function(i, validator) {
        validators[validator] = {};
        if (!$.isEmptyObject(RedPenUI.currentConfiguration.redpens[lang].validators[validator].properties)) {
            validators[validator].properties = RedPenUI.currentConfiguration.redpens[lang].validators[validator].properties;
        }
    });

    return {
        lang: $("#redpen-language").val(),
        validators: validators,
        symbols: RedPenUI.currentConfiguration.redpens[lang].symbols
    };
};

RedPenUI.Utils.formatError = function(sentence, error, contextWidth) {
    var message = "";
    message += "Line " + error.position.start.line + ":" + error.position.start.offset + " \u201C";
    var left = Math.max(0, error.subsentence.offset - contextWidth);
    var right = Math.min(sentence.length, error.subsentence.offset + error.subsentence.length + contextWidth);
    message += left == 0 ? "" : "\u2026";

    message += sentence.substring(left, error.subsentence.offset);
    message += error.subsentence.length ? "\u3010" : "\u25b6";
    message += sentence.substr(error.subsentence.offset, error.subsentence.length);
    message += error.subsentence.length ? "\u3011" : "";
    message += sentence.substring(error.subsentence.offset + error.subsentence.length, right);

    message += right == sentence.length ? "" : "\u2026";
    message += "\u201D\n";
    message += error.message;
    message += "\n";
    return message;
};

// sample "plain text" report
RedPenUI.Utils.createRedPenReport = function(errorListBySentences) {
    var report = "";
    if (errorListBySentences) {
        for (var i = 0; i < errorListBySentences.length; i++) {
            var errorsInSentence = errorListBySentences[i];
            for (var j = 0; j < errorsInSentence.errors.length; j++) {
                report += RedPenUI.Utils.formatError(errorsInSentence.sentence, errorsInSentence.errors[j], 12);
                report += '\n';
            }
        }
    }
    return report;
};

RedPenUI.Utils.editorText = function (newText) {
    if (newText) {
        $('#redpen-editor').val(newText);
    }
    return $('#redpen-editor').val();
};

RedPenUI.Utils.extractAnnotations = function(lines, errors) {
    var annotated = [];
    for (var i = 1; i < lines.length; i++) { // NOTE: start sentence from 1
        var sentence = lines[i];
        annotated[i] = [];
        for (var j = 0; j < sentence.length; j++) {
            annotated[i].push({char: sentence[j], errorStart: [], errorEnd: []});
        }
    }

    for (var i = 0; i < errors.length; i++) {
        var lineNo = errors[i].position.end.line;
        if (lineNo < lines.length) {
            var start = errors[i].position.start.offset ? errors[i].position.start.offset : 0;
            var end = errors[i].position.end.offset ? errors[i].position.end.offset : 0;
            if ((start != 0) || (end != 0)) {
                if (annotated[lineNo][start]) {
                    annotated[lineNo][start].errorStart.push({id: i + 1, error: errors[i]});
                }
                errors[i].annotated = true;
            }
            if (annotated[lineNo] && annotated[lineNo][end]) {
                annotated[lineNo][end].errorEnd.push({id: i + 1, error: errors[i]});
                errors[i].annotated = true;
            }
        }
    }
    return annotated;
};


RedPenUI.Utils.renderErrors = function(annotated) {
    var annotatedSpan = $("<span></span>").addClass("redpen-annotated-sentence");
    var text = "";

    var addText = function (highlight) {
        if (text != "") {
            $(annotatedSpan).append($(highlight ? "<i></i>" : "<span></span>").text(text));
        }
        text = "";
    };

    var errorOpen = false;
    for (var line = 1; line < annotated.length; line++) {
        if (line != 1) {
            addText(false);
            $(annotatedSpan).append("<br/>");
        }
        for (var i = 0; i < annotated[line].length; i++) {
            if (errorOpen && annotated[line][i].errorEnd.length) {
                addText(true);
                errorOpen = false;
            }
            if (annotated[line][i].errorEnd.length) {
                var ids = "";
                for (var j = 0; j < annotated[line][i].errorEnd.length; j++) {
                    if (j > 3) {
                        ids += "&hellip;";
                        break;
                    }
                    if (ids != "") {
                        ids += ",";
                    }
                    ids += annotated[line][i].errorEnd[j].id;
                }
                addText(false);
                $(annotatedSpan).append(
                    $('<div></div>')
                        .addClass("redpen-annotated-sentence-marker")
                        .html(ids)
                );
            }
            if (annotated[line][i].errorStart.length) {
                addText(false);
                errorOpen = true;
            }
            if (errorOpen && annotated[line][i].errorEnd.length) {
                addText(true);
                errorOpen = false;
            }
            text += annotated[line][i].char;
        }
    }
    addText(false);
    return $(annotatedSpan);
};

RedPenUI.Utils.annotateDocument = function (errors) {

    var getSourceLines = function () {
        var document = RedPenUI.Utils.editorText();
        return ("\n" + document).split("\n");
    };

    var annotated = RedPenUI.Utils.extractAnnotations(getSourceLines(), errors);
    return RedPenUI.Utils.renderErrors(annotated);
};


// format RedPen errors in situ
RedPenUI.Utils.showErrorsInSitu = function (errors) {

    // display an error
    var addError = function (errorList, error) {
        $(errorList).append($('<li></li>')
            .addClass('redpen-error-message')
            .toggleClass('redpen-error-message-annotated', error.annotated)
            .text(error.message)
            .append($("<div></div>")
                .addClass('redpen-error-validator')
                .text(error.validator)
            )
            .click(function () {
                RedPenUI.Utils.setEditPosition(error);
            })
        )
    };

    // get a list of the checked validators
    var validators = {};
    $("#redpen-active-validators").find("input:checked").each(function () {
        validators[$(this).val()] = true;
    });

    var errorsList = $('#redpen-errors').empty();
    var editorUnderlay = $('#redpen-editor-underlay').empty();

    var allErrors = [];
    for (var i = 0; i < errors.length; i++) {
        for (var j = 0; j < errors[i].errors.length; j++) {
            allErrors.push(errors[i].errors[j]);
        }
    }
    allErrors.sort(function (a, b) {
        var lineDiff = a.position.end.line - b.position.end.line;
        return lineDiff == 0 ? a.position.end.offset - b.position.end.offset : lineDiff;
    });

    var annotatedSentence = RedPenUI.Utils.annotateDocument(allErrors);
    var errorDiv = $('<div></div>').addClass('redpen-error-section');
    var errorList = $('<ol></ol>').addClass('redpen-error-list');
    $(errorsList).append(errorDiv);
    $(editorUnderlay)
        .addClass('redpen-error-sentence')
        .html(annotatedSentence);
    $(errorDiv)
        .append($("<p></p>").html("<span class='redpen-red'>Red</span>Pen found " + allErrors.length + " error" + (allErrors.length == 1 ? "" : "s")))
        .append(errorList);
    for (var j = 0; j < allErrors.length; j++) {
        addError(errorList, allErrors[j]);
    }
}; // end of ShowErrorsInSitu

// call RedPen to validate the document and display any errors
RedPenUI.Utils.validateDocument = function () {
    var activeValidators = $("#redpen-active-validators").find("input:checked")
    var requestParams = {
        document: RedPenUI.Utils.editorText(),
        format: 'json2',
        documentParser: $("#redpen-document-parser").val(),
        config: RedPenUI.Utils.getConfiguration(
            $("#redpen-configuration").val(),
            $.map(activeValidators, function(element){return $(element).val()}))
    };
    $("#redpen-results-request").text(JSON.stringify(requestParams, null, 2));
    redpen.validateJSON(
        requestParams,
        function (data) {
            // display the raw results as JSON
            $('#redpen-results-json').text(JSON.stringify(data, null, 2));
            RedPenUI.Utils.showErrorsInSitu(data['errors']);
            $('#redpen-editor-underlay').fadeIn();
            $('#redpen-results-report').text(RedPenUI.Utils.createRedPenReport(data['errors']));
        });
};

// show the options for a given redpen
RedPenUI.Utils.showConfigurationOptions = function (redpenName) {
    $("#redpen-active-validators")
        .empty()
        .append(RedPenUI.validatorConfigBlocks[redpenName])
        .find('input').click(RedPenUI.Utils.validateDocument);

    $("#redpen-active-validators").find(".redpen-editable").each(function (i, n) {
        if ($(this).text() == "add properties") { // workaround to fix x-editable empty-detection on reapplication
            $(this).text("");
        }
        $(this).editable({
            mode: 'popup',
            container: 'body',
            emptytext: 'add properties',
            placement: "left",
            type: 'text',
            success: function (response, newValue) {
                var redpen = $(this).data("pk");
                var validator = $(this).attr("name");
                var properties = newValue.split(";");
                for (var i = 0; i < properties.length; i++) {
                    if (properties[i].trim().length == 0) continue;
                    var nameValue = properties[i].split("=", 2);
                    if (nameValue.length == 2) {
                        RedPenUI.currentConfiguration.redpens[redpen].validators[validator].properties[nameValue[0].trim()] = nameValue[1].trim();
                    } else {
                        alert("Property must be in key=value format: " + nameValue);
                        return false;
                    }
                }
                RedPenUI.Utils.validateDocument();
            }
        });
    });

    $("#redpen-active-symbols")
        .empty()
        .append(RedPenUI.symbolTableBlocks[redpenName]);

    $("#redpen-active-symbols").find(".redpen-editable").each(function (i, n) {
        if ($(this).text() == "none") { // workaround to fix x-editable empty-detection on reapplication
            $(this).text("");
        }
        $(this).editable({
            mode: 'popup',
            emptytext: 'none',
            placement: "top",
            type: 'text',
            success: function (response, newValue) {
                var redpen = $(this).data("pk");
                var symbolName = $(this).attr("name");
                var invalidChars = $(this).data("invalid-chars");
                if (invalidChars) {
                    RedPenUI.currentConfiguration.redpens[redpen].symbols[symbolName].invalid_chars = newValue;
                }
                else {
                    RedPenUI.currentConfiguration.redpens[redpen].symbols[symbolName].value = newValue[0] ? newValue[0] : "";
                }
                RedPenUI.Utils.validateDocument();
            }
        });
    });

    $("#redpen-active-symbols").find("[type=checkbox]").each(function (i, n) {
        $(this).off("change").on("change", function () {
            var redpen = $(this).data("pk");
            var symbolName = $(this).attr("name");
            var property = $(this).attr("value");
            RedPenUI.currentConfiguration.redpens[redpen].symbols[symbolName][property] = $(this).is(":checked");
            RedPenUI.Utils.validateDocument();
        });
    });
}; // end of ShowConfigurationOptions

// ensure the options displayed are appropriate for the selected language
RedPenUI.Utils.setLanguage = function (lang) {
    var firstValidRedpen = false;
    $("#redpen-configuration").find("option").each(function () {
        var valid = $(this).data("lang") == lang;
        $(this).toggle(valid);
        if (valid && !firstValidRedpen) {
            firstValidRedpen = $(this).val();
        }
    });
    $("#redpen-configuration").val(firstValidRedpen);
    $("#redpen-language").val(lang);
    RedPenUI.Utils.showConfigurationOptions(firstValidRedpen);
};

RedPenUI.Utils.exportConfiguration = function () {
    var activeValidators = $("#redpen-active-validators").find("input:checked");
    var params = {
        config: RedPenUI.Utils.getConfiguration(
          $("#redpen-configuration").val(),
          $.map(activeValidators, function(element){return $(element).val()}))
    };
    redpen.export(params, function (data) {
        var URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(data)], {type: 'application/xml'}));

        var link = document.createElement('a');
        if (typeof link.download === 'undefined') {
            window.location = url;
            // cleanup
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 100);
        } else {
            document.body.appendChild(link);
            link.href = url;
            link.download = 'redpen-conf.xml';
            link.click();
            // cleanup
            setTimeout(function () {
                URL.revokeObjectURL(url);
                document.body.removeChild(link);
            }, 100);
        }
    });
};


RedPenUI.showComponents = function(configuration) {
    RedPenUI.currentConfiguration = configuration; // for non-inner methods

    // align the annotated underlay with the textarea
    var repositionEditorUnderlay = function () {
        $("#redpen-editor-underlay").css("top", -$("#redpen-editor").scrollTop());
    };

    // revalidate the document using the currently selected options
    var delayedRevalidateDocument = function () {
        repositionEditorUnderlay();
        $('#redpen-editor-underlay').fadeOut(50);
        if (RedPenUI.permitLanguageAutoDetect) {
            redpen.detectLanguage(RedPenUI.Utils.editorText(), function (lang) {
                RedPenUI.Utils.setLanguage(lang);
            });
        }
        // debounce changes
        clearTimeout(RedPenUI.validateTimeout);
        RedPenUI.validateTimeout = setTimeout(RedPenUI.Utils.validateDocument, 250);
    };

    // start of main procedure
    $("#redpen-version").text("RedPen version " + configuration.version);
    var discoveredLanguages = {};

    // build options for each configured redpen
    for (var redpenName in configuration.redpens) {
        var config = configuration.redpens[redpenName];
        $("#redpen-configuration").append(
            $('<option></option>')
                .prop("value", redpenName)
                .data("lang", config.lang)
                .text(redpenName)
        );
        discoveredLanguages[config.lang] = true;
        var validatorCheckboxes = $('<div></div>').addClass('redpen-validators');
        RedPenUI.validatorConfigBlocks[redpenName] = validatorCheckboxes;
        for (var validatorName in config.validators) {
            var validator = config.validators[validatorName];
            var propertiesText = "";

            if (validator.properties) {
                for (var property in validator.properties) {
                    propertiesText += (propertiesText == "") ? "" : "; ";
                    propertiesText += property + "=" + validator.properties[property];
                }
            }
            var properties = $("<div></div>")
                .addClass("redpen-validator-properties")
                .addClass("redpen-editable")
                .attr("name", validatorName)
                .attr("data-pk", redpenName)
                .attr("data-title", validatorName + " properties")
                .text(propertiesText);

            $(validatorCheckboxes).append(
                $('<div></div>')
                    .addClass("checkbox")
                    .append(
                        $('<label></label>')
                            .append(
                                $('<input/>')
                                    .prop("type", "checkbox")
                                    .prop("checked", true)
                                    .prop("value", validatorName)
                            )
                            .append($('<span></span>')
                                .html(validatorName + (validator.languages.length ? ' <i>' + validator.languages.join(',') + '</i>' : ''))
                            )
                    ).append(properties)
            );
        }

        var symbolTableEntry = $('<table></table>').addClass('redpen-symboltable');
        RedPenUI.symbolTableBlocks[redpenName] = symbolTableEntry;
        $(symbolTableEntry).append(
            $('<tr></tr>')
                .append($('<th></th>').text(""))
                .append($('<th></th>').text("Value"))
                .append($('<th></th>').html("Invalid<br/>Chars"))
                .append($('<th></th>').html("Space<br/>Before"))
                .append($('<th></th>').html("Space<br/>After"))
        );
        for (var symbolName in config.symbols) {
            var symbol = config.symbols[symbolName];
            $(symbolTableEntry).append(
                $('<tr></tr>')
                    .append($('<td></td>').text(symbolName))
                    .append($('<td></td>')
                        .addClass("redpen-editable")
                        .text(symbol.value)
                        .attr("name", symbolName)
                        .attr("data-pk", redpenName)
                        .attr("data-invalid-chars", false)
                    )
                    .append($('<td></td>')
                        .addClass("redpen-editable")
                        .text(symbol.invalid_chars)
                        .attr("name", symbolName)
                        .attr("data-pk", redpenName)
                        .attr("data-invalid-chars", true)
                    )
                    .append($('<td></td>')
                        .append(
                            $('<input/>')
                                .attr("type", "checkbox")
                                .attr("checked", symbol.before_space)
                                .attr("name", symbolName)
                                .attr("value", "before_space")
                                .attr("data-pk", redpenName)
                        ))
                    .append($('<td></td>')
                        .append(
                            $('<input/>')
                                .attr("type", "checkbox")
                                .attr("checked", symbol.after_space)
                                .attr("name", symbolName)
                                .attr("value", "after_space")
                                .attr("data-pk", redpenName)
                        ))
            );
        }
    }

    // populate the language options
    for (var language in discoveredLanguages) {
        $("#redpen-language").append(
            $('<option></option>')
                .prop("value", language)
                .text(language)
        );
    }

    // populate the document parser options
    for (var i = 0; i < configuration.documentParsers.length; i++) {
        var parser = configuration.documentParsers[i];
        $("#redpen-document-parser").append(
            $('<option></option>')
                .prop("value", parser)
                .text(parser)
        );
    }

    // cheap tabs
    $("#redpen-option-results li").click(function () {
        $(this).siblings().each(function (i, item) {
            $(this).removeClass("redpen-option-selected");
            $($(this).data("target")).hide();
        });
        $($(this).data("target")).show();
        $(this).addClass("redpen-option-selected");
    });

    // bind events
    $('#redpen-editor')
        .on("blur paste input", delayedRevalidateDocument)
        .scroll(repositionEditorUnderlay);

    $("#redpen-document-parser").change(RedPenUI.Utils.validateDocument);

    $("#redpen-language").change(function () {
        RedPenUI.permitLanguageAutoDetect = false; // prevent auto-detection from subsequently overriding the user's
        // selection
        RedPenUI.Utils.setLanguage($(this).val());
        RedPenUI.Utils.validateDocument();
    });

    $("#redpen-configuration").change(function () {
        RedPenUI.Utils.showConfigurationOptions($(this).val());
        RedPenUI.Utils.validateDocument();
    });

    $("#redpen-export").click(function () {
        RedPenUI.Utils.exportConfiguration();
    });

    $("#redpen-token-editor").on("change keyup", RedPenUI.Utils.updateTokens);
    $("input[type='radio'][name='redpen-token-lang']").on("change", RedPenUI.Utils.updateTokens);

    // set the initial state
    RedPenUI.Utils.setLanguage("en");
    RedPenUI.pasteSampleText("en_md");

    // dumb animation
    var x = 1;
    setInterval(function () {
        $(".redpen-annotated-sentence i").css("background-position", (x++) + "px 0px");
    }, 150);
};

// load the configuration and build the options and controls
RedPenUI.Show = function() {
    redpen.getRedPens(RedPenUI.showComponents); // end of getRedPens
}; // end of Show
