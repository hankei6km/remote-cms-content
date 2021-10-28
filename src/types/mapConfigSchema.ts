// Code generated by scripts/mapconfig-schema-build.sh; DO NOT EDIT.

export const mapConfigSchema =
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "definitions": {
        "RegExp": {
            "additionalProperties": false,
            "properties": {
                "dotAll": {
                    "type": "boolean"
                },
                "flags": {
                    "type": "string"
                },
                "global": {
                    "type": "boolean"
                },
                "ignoreCase": {
                    "type": "boolean"
                },
                "lastIndex": {
                    "type": "number"
                },
                "multiline": {
                    "type": "boolean"
                },
                "source": {
                    "type": "string"
                },
                "sticky": {
                    "type": "boolean"
                },
                "unicode": {
                    "type": "boolean"
                }
            },
            "required": [
                "dotAll",
                "flags",
                "global",
                "ignoreCase",
                "lastIndex",
                "multiline",
                "source",
                "sticky",
                "unicode"
            ],
            "type": "object"
        }
    },
    "properties": {
        "flds": {
            "items": {
                "anyOf": [
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "id"
                                ],
                                "type": "string"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "number"
                                ],
                                "type": "string"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "string"
                                ],
                                "type": "string"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "datetime"
                                ],
                                "type": "string"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fileNameField": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "image"
                                ],
                                "type": "string"
                            },
                            "setSize": {
                                "type": "boolean"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "fldType": {
                                "enum": [
                                    "enum"
                                ],
                                "type": "string"
                            },
                            "replace": {
                                "items": {
                                    "additionalProperties": false,
                                    "properties": {
                                        "pattern": {
                                            "anyOf": [
                                                {
                                                    "$ref": "#/definitions/RegExp"
                                                },
                                                {
                                                    "type": "string"
                                                }
                                            ]
                                        },
                                        "replacement": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "pattern",
                                        "replacement"
                                    ],
                                    "type": "object"
                                },
                                "type": "array"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "replace",
                            "srcName"
                        ],
                        "type": "object"
                    },
                    {
                        "additionalProperties": false,
                        "properties": {
                            "dstName": {
                                "type": "string"
                            },
                            "embedImgAttrs": {
                                "anyOf": [
                                    {
                                        "additionalProperties": false,
                                        "properties": {
                                            "baseURL": {
                                                "type": "string"
                                            },
                                            "embedTo": {
                                                "enum": [
                                                    "alt",
                                                    "block"
                                                ],
                                                "type": "string"
                                            },
                                            "pickAttrs": {
                                                "items": {
                                                    "type": "string"
                                                },
                                                "type": "array"
                                            }
                                        },
                                        "type": "object"
                                    },
                                    {
                                        "items": {
                                            "additionalProperties": false,
                                            "properties": {
                                                "baseURL": {
                                                    "type": "string"
                                                },
                                                "embedTo": {
                                                    "enum": [
                                                        "alt",
                                                        "block"
                                                    ],
                                                    "type": "string"
                                                },
                                                "pickAttrs": {
                                                    "items": {
                                                        "type": "string"
                                                    },
                                                    "type": "array"
                                                }
                                            },
                                            "type": "object"
                                        },
                                        "type": "array"
                                    }
                                ]
                            },
                            "fldType": {
                                "enum": [
                                    "html"
                                ],
                                "type": "string"
                            },
                            "srcName": {
                                "type": "string"
                            }
                        },
                        "required": [
                            "dstName",
                            "fldType",
                            "srcName"
                        ],
                        "type": "object"
                    }
                ]
            },
            "type": "array"
        },
        "media": {
            "additionalProperties": false,
            "properties": {
                "image": {
                    "additionalProperties": false,
                    "properties": {
                        "download": {
                            "type": "boolean"
                        },
                        "fileNameField": {
                            "type": "string"
                        },
                        "library": {
                            "items": [
                                {
                                    "additionalProperties": false,
                                    "properties": {
                                        "download": {
                                            "type": "boolean"
                                        },
                                        "kind": {
                                            "enum": [
                                                "imgix"
                                            ],
                                            "type": "string"
                                        },
                                        "src": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "kind",
                                        "src"
                                    ],
                                    "type": "object"
                                }
                            ],
                            "maxItems": 1,
                            "minItems": 1,
                            "type": "array"
                        }
                    },
                    "type": "object"
                }
            },
            "type": "object"
        },
        "passthruUnmapped": {
            "type": "boolean"
        }
    },
    "required": [
        "flds"
    ],
    "type": "object"
}

