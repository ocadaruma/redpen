/*
 * redpen: a text inspection tool
 * Copyright (c) 2014-2015 Recruit Technologies Co., Ltd. and contributors
 * (see CONTRIBUTORS.md)
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
describe('setEditPosition', function() {

    var textarea;

    beforeEach(function() {
        $('body').empty();
        textarea = $('<textarea id="redpen-editor"></textarea>').val('This is is a pen.').appendTo('body');
    });

    it('setSelectionPosition', function() {
        var errors = [
            {
                "subsentence": {
                    "offset": 8,
                    "length": 2
                },
                "validator": "SuccessiveWord",
                "position": {
                    "start": {
                        "offset": 8,
                        "line": 1
                    },
                    "end": {
                        "offset": 10,
                        "line": 1
                    }
                },
                "message": "Found word \"is\" repeated twice in succession."
            }
        ]
        spyOn(textarea[0], 'setSelectionRange');
        RedPenUI.Utils.setEditPosition(errors[0]);
        expect(textarea[0].setSelectionRange).toHaveBeenCalledWith(10,10);
    });

    it('canPasteSampleText', function() {
        RedPenUI.sampleDocuments = {
            en: {
                parser: "PLAIN",
                document: "It is is cool!"
            },
            ja: {
                parser: "PLAIN",
                document: "そこにシビれる あこがれるゥ。"
            },
            en_md: {
                parser: "MARKDOWN", document: "# Instances\n" +
                "Soo cool!"
            },
            ja_md: {
                parser: "MARKDOWN",
                document: "# 分散処理\n"
            }
        }

        var viewValidator = $('<section id="redpen-view-validator">').appendTo('body');
        RedPenUI.pasteSampleText("en"); // plain
        expect("It is is cool!", viewValidator.val())
        expect(true, viewValidator.is(":visible"))

        RedPenUI.pasteSampleText("ja_md"); // markdown
        expect("# 分散処理", viewValidator.val())
        expect(true, viewValidator.is(":visible"))
    });

    it('canGetConfiguration', function() {
        var sampleConfig = {
            "documentParsers": ["PLAIN", "LATEX"],
            "redpens": {
                "en": {
                    "lang": "en",
                    "symbols": {
                        "AMPERSAND": {
                            "after_space": false,
                            "before_space": false,
                            "invalid_chars": "ï¼†",
                            "value": "&"
                        },
                        "ASTERISK": {
                            "after_space": false,
                            "before_space": false,
                            "invalid_chars": "ï¼Š",
                            "value": "*"
                        }
                    },
                    "tokenizer": "cc.redpen.tokenizer.WhiteSpaceTokenizer",
                    "validators": {
                        "CommaNumber": {
                            "languages": [],
                            "properties": {"max_num": "3"}
                        },
                        "Contraction": {
                            "languages": ["en"],
                            "properties": {}
                        }
                    },
                    "variant": ""
                }
            },
            "version": "1.7.0"
        }

        var activeValidators = ["Contraction"]; // NOTE: CommaNumber is not active
        RedPenUI.currentConfiguration = sampleConfig;
        var config = RedPenUI.Utils.getConfiguration("en", activeValidators);
        expect(1, config.validators.length)
        expect(2, config.symbols.length)
    });

    it('canFormatError', function() {
        var error = {
            "subsentence": {
                "offset": 5,
                "length": 12
            },
            "validator": "Spelling",
            "position": {
                "start": {
                    "offset": 5,
                    "line": 1
                },
                "end": {
                    "offset": 17,
                    "line": 1
                }
            },
            "message": "Found possibly misspelled word \"distriubuted\".",
            "annotated": true
        };
        var sentence = "Such distriubuted systems need a component to merge the preliminary results from member instnaces.";
        expect("Line 1:5 “Such 【distriubuted】 systems nee…\nFound possibly misspelled word \"distriubuted\".",
            RedPenUI.Utils.formatError(sentence, error, 12));
    });

    it('canExtractAnnotation', function() {
        var lines = ["", "Such distriubuted systems need a component to merge the preliminary results."]
        var errors = [
            {
                "subsentence": {
                    "offset": 5,
                    "length": 12
                },
                "validator": "Spelling",
                "position": {
                    "start": {
                        "offset": 5,
                        "line": 1
                    },
                    "end": {
                        "offset": 17,
                        "line": 1
                    }
                },
                "message": "Found possibly misspelled word \"distriubuted\"."
            }
        ];
        var expected = [
            null,
            [
                {
                    "char": "S",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "c",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "h",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [
                        {
                            "id": 1,
                            "error": {
                                "subsentence": {
                                    "offset": 5,
                                    "length": 12
                                },
                                "validator": "Spelling",
                                "position": {
                                    "start": {
                                        "offset": 5,
                                        "line": 1
                                    },
                                    "end": {
                                        "offset": 17,
                                        "line": 1
                                    }
                                },
                                "message": "Found possibly misspelled word \"distriubuted\".",
                                "annotated": true
                            }
                        }
                    ],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "b",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": [
                        {
                            "id": 1,
                            "error": {
                                "subsentence": {
                                    "offset": 5,
                                    "length": 12
                                },
                                "validator": "Spelling",
                                "position": {
                                    "start": {
                                        "offset": 5,
                                        "line": 1
                                    },
                                    "end": {
                                        "offset": 17,
                                        "line": 1
                                    }
                                },
                                "message": "Found possibly misspelled word \"distriubuted\".",
                                "annotated": true
                            }
                        }
                    ]
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "y",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "a",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "c",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "p",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "g",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "h",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "p",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "l",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "a",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "y",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "l",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": ".",
                    "errorStart": [],
                    "errorEnd": []
                }
            ]
        ];
        expect(expected, RedPenUI.Utils.extractAnnotations(lines, errors));
    });


    it('canAnnotateText', function() {
        var annotation = [
            null,
            [
                {
                    "char": "S",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "c",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "h",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [
                        {
                            "id": 1,
                            "error": {
                                "subsentence": {
                                    "offset": 5,
                                    "length": 12
                                },
                                "validator": "Spelling",
                                "position": {
                                    "start": {
                                        "offset": 5,
                                        "line": 1
                                    },
                                    "end": {
                                        "offset": 17,
                                        "line": 1
                                    }
                                },
                                "message": "Found possibly misspelled word \"distriubuted\".",
                                "annotated": true
                            }
                        }
                    ],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "b",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": [
                        {
                            "id": 1,
                            "error": {
                                "subsentence": {
                                    "offset": 5,
                                    "length": 12
                                },
                                "validator": "Spelling",
                                "position": {
                                    "start": {
                                        "offset": 5,
                                        "line": 1
                                    },
                                    "end": {
                                        "offset": 17,
                                        "line": 1
                                    }
                                },
                                "message": "Found possibly misspelled word \"distriubuted\".",
                                "annotated": true
                            }
                        }
                    ]
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "y",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "d",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "a",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "c",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "p",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "o",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "g",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "h",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "p",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "l",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "m",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "i",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "n",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "a",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "y",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": " ",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "r",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "e",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "u",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "l",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "t",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": "s",
                    "errorStart": [],
                    "errorEnd": []
                },
                {
                    "char": ".",
                    "errorStart": [],
                    "errorEnd": []
                }
            ]
        ];

        var expected = "<span>Such </span><i>distriubuted</i><div" +
            " class=\"redpen-annotated-sentence-marker\">1</div><span> systems need a component to merge the preliminary results.</span>"
        expect(expected, RedPenUI.Utils.renderErrors(annotation))
    });

});
