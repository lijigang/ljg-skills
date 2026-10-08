import { describe, expect, test } from "bun:test";
import { BLOCKS, renderModel, validateModel } from "./Render";
import example from "../Example.json";

const copy = () => structuredClone(example);
describe("ljg-business-model 内容与输出边界", () => {
  test("完整案例包含经典九模块、来源与署名", () => {
    const html = renderModel(copy());
    expect((html.match(/data-block="/g) ?? []).length).toBe(9);
    for (const b of BLOCKS) expect(html).toContain(`data-block="${b.key}"`);
    expect(html).toContain("Strategyzer.com");
    expect(html).toContain("CC BY-SA 3.0");
  });
  test("九格允许空白且全部显式标记待补充", () => {
    const model = copy();
    for (const b of BLOCKS) (model.blocks[b.key] as unknown[]) = [];
    model.sources = [];
    const html = renderModel(model);
    expect((html.match(/class="item unknown"/g) ?? []).length).toBe(9);
    expect(html).toContain("9 项待补充");
  });
  test("缺失模块、Lean Canvas 替换、超载文本均被拒绝", () => {
    const model: any = copy();
    delete model.blocks.key_resources;
    expect(() => validateModel(model)).toThrow("key_resources");
    const lean: any = copy(); lean.blocks.problem = [];
    expect(() => validateModel(lean)).toThrow("problem");
    const long = copy(); long.blocks.key_partners[0].text = "长".repeat(91);
    expect(() => validateModel(long)).toThrow("90");
  });
  test("事实引用、推测依据与客户对应不可静默缺失", () => {
    const missingRef: any = copy(); missingRef.blocks.key_partners[0].source_refs = [];
    expect(() => validateModel(missingRef)).toThrow("source_refs");
    const wrongRef: any = copy(); wrongRef.blocks.key_partners[0].source_refs = ["S2"];
    expect(() => validateModel(wrongRef)).toThrow("来源");
    const inferred: any = copy(); delete inferred.blocks.value_propositions[1].reason;
    expect(() => validateModel(inferred)).toThrow("reason");
    const segment: any = copy(); segment.blocks.customer_segments[0].segment = "C9";
    expect(() => validateModel(segment)).toThrow("客户编号");
  });
  test("输入文字不会成为可执行 HTML 或属性", () => {
    const model = copy(); model.blocks.key_partners[0].text = '<img src=x onerror="alert(1)">';
    const html = renderModel(model);
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain("虚构案例：社区咖啡店提供");
  });
  test("支持多个客户群且保留对应标记", () => {
    const model = copy(); model.segments.push({ id: "C2", label: "团队采购者" });
    model.blocks.customer_segments[0].segment = "C2";
    const html = renderModel(model);
    expect(html).toContain('class="segment s1">C2</span>');
  });
  test("不允许错误日期或不可读的过小画布", () => {
    const model = copy(); model.date = "2026-02-30";
    expect(() => validateModel(model)).toThrow();
    expect(() => renderModel(copy(), 600)).toThrow("width");
  });
});
