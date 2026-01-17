export const getKana = async (text: string): Promise<string[]> => {
	const res = await fetch(
		`http://127.0.0.1:50021/accent_phrases?text=${text}&speaker=1`,
		{
			method: "POST",
		},
	);
	const query = await res.json();
	const moras: string[] = [];
	//@ts-expect-error
	query.forEach((phrase) => {
		//@ts-expect-error
		phrase.moras.forEach((mora) => {
			moras.push(mora.text);
		});
	});
	return moras;
};
