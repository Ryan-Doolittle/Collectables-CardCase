import { DependencyContainer } from "tsyringe";
import { IPostsptLoadMod } from "@spt/models/external/IPostsptLoadMod";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { cardIDs } from "./card_ids";
import * as modConfig from "../config/mod_config.json";
import * as caseConfig from "../config/card_case.json";


class CardCase implements IPostsptLoadMod, IPostDBLoadMod 
{
    private logger: ILogger;
    private modName;

    constructor() 
    {
        this.modName = "Card Case";
    }

    public postDBLoad(container: DependencyContainer): void 
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.log(`[${this.modName}] : Initializing`, "green");

        const jsonUtil = container.resolve<JsonUtil>("JsonUtil");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const tables = databaseServer.getTables();
        const handbook = tables.templates.handbook;
        const locales = Object.values(tables.locales.global) as Record<string, string>[];
        const configTraders = configServer.getConfigByString("spt-trader");
        const configRagfair = configServer.getConfigByString("spt-ragfair");

        const fenceBlacklist = configTraders["fence"]["blacklist"]
        const ragfairBlacklist = configRagfair["dynamic"]["blacklist"]["custom"]


        const traderIDs = {
            mechanic: "5a7c2eca46aef81a7ca2145d",
            skier: "58330581ace78e27b8b10cee",
            peacekeeper: "5935c25fb3acc3127c3d8cd9",
            therapist: "54cb57776803fa99248b456e",
            prapor: "54cb50c76803fa8b248b4571",
            jaeger: "5c0647fdd443bc2504c2d371",
            ragman: "5ac3b934156ae10c4430e83c"
        };

        const currencyIDs = {
            roubles: "5449016a4bdc2d6f028b456f",
            euros: "569668774bdc2da2298b4568",
            dollars: "5696686a4bdc2da3298b456a"
        };

        const item = this.createCustomItem(jsonUtil, tables, caseConfig);
        tables.templates.items[caseConfig.id] = item;
        this.addLocales(locales, caseConfig);
        this.addItemToHandbook(handbook, caseConfig);
        this.addToTraderInventory(tables, caseConfig, traderIDs, currencyIDs);
        this.addItemToTrophyStand(tables, caseConfig)
        fenceBlacklist.push(caseConfig.id)
        ragfairBlacklist.push(caseConfig.id)

        this.logger.log(`[${this.modName}] : Show me what you got!`, "green");
    }

    private createCustomItem(jsonUtil: JsonUtil, tables, config): any 
    {
        const item = jsonUtil.clone(tables.templates.items[config.clone_item]);
        item._id = config.id;
        item._name = config.item_name;
        item._props.Prefab.path = config.item_prefab_path;
        item._parent = config.item_parent;
        item._props.Name = config.item_name;
        item._props.ShortName = config.item_short_name;
        item._props.Description = config.item_description;
        item._props.StackMaxSize = config.stack_max_size;
        item._props.ItemSound = config.item_sound;
        item._props.Width = config.ExternalSize.width;
        item._props.Height = config.ExternalSize.height;
        item._props.Weight = config.weight;
        item._props.BackgroundColor = config.color;
        item._props.QuestItem = config.quest_item;
        item._props.InsuranceDisabled = config.insurancedisabled;
        item._props.IsAlwaysAvailableForInsurance = config.availableforinsurance;
        item._props.IsUnremovable = config.isunremovable;
        item._props.ExaminedByDefault = config.examinedbydefault;
        item._props.DiscardingBlock = config.discardingblock;
        item._props.IsUndiscardable = config.isundiscardable;
        item._props.IsUngivable = config.isungivable;
        item._props.DiscardLimit = config.discardlimit;
        item._props.CanSellOnRagfair = config.can_sell_on_ragfair;

        let filter = []
        cardIDs.forEach(id => {
            filter.push(id)
            this.debug_to_console(`Added ${id} to card case`, "blue")
        })

        item._props.Slots = [
            {
                "_name": "mod_mount_1",
                "_id": "card_slot",
                "_parent": config.id,
                "_props": {
                    "filters": [
                        {
                            "Shift": 0,
                            "Filter": filter
                        }
                    ]
                },
                "_required": false,
                "_mergeSlotWithChildren": false,
                "_proto": "55d30c4c4bdc2db4468b457e"
            }
        ];
        return item;
    }

    private addLocales(locales, config): void 
    {
        locales.forEach(locale => 
        {
            locale[`${config.id} Name`] = config.item_name;
            locale[`${config.id} ShortName`] = config.item_short_name;
            locale[`${config.id} Description`] = config.item_description;
        });
    }

    private addItemToHandbook(handbook, config): void 
    {
        handbook.Items.push({
            Id: config.id,
            ParentId: config.category_id,
            Price: config.price
        });
    }

    private addToTraderInventory(tables, config, traderIDs, currencyIDs): void 
    {
        if (config.sold) 
        {
            this.debug_to_console(`Adding ${config.item_name} to ${config.trader}`, "blue")

            const traderId = traderIDs[config.trader] || config.trader;
            const currencyId = currencyIDs[config.currency] || config.currency;
            let trader = tables.traders[traderId];
            if (!trader) {
                trader = tables.traders[traderIDs[modConfig.fallback_trader]];
            }

            trader.assort.items.push({
                _id: config.id,
                _tpl: config.id,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    UnlimitedCount: config.unlimited_stock,
                    StackObjectsCount: config.stock_amount
                }
            });

            trader.assort.barter_scheme[config.id] = [
                [
                    {
                        count: config.price,
                        _tpl: currencyId
                    }
                ]
            ];

            trader.assort.loyal_level_items[config.id] = config.trader_loyalty_level;
        }
    }

    private addItemToTrophyStand(tables: any, config: any): any {
        if (config.is_trophy) {
            const templates = tables.templates.items;
            const itemsToUpdate = [
                "63dbd45917fff4dee40fe16e",
                "65424185a57eea37ed6562e9",
                "6542435ea57eea37ed6562f0"
            ];

            itemsToUpdate.forEach(itemsToUpdate => {
                const item = templates[itemsToUpdate];
                if (item && item._props && item._props.Slots) {
                    const slots = item._props.Slots;
                    slots.forEach((slot: any) => {
                        if (slot._name.includes("bigTrophies")) {
                            slot._props.filters.forEach((filterGroup: { Filter: string[] }) => {
                                filterGroup.Filter.push(config.id);
                            });
                        }
                    });
                }
            });
        }
    }

    private debug_to_console(string:string, color:string): any
    {
        if (modConfig.debug)
        {
            this.logger.log(`[${this.modName}] : ${string}`, color);
        }
    }
}

module.exports = { mod: new CardCase() }
