export const parseIssue = (issue: any, config: any) => {
  const {
    sectionSeparator,
    descriptionPrefix,
    descriptionSufix,
    optionLabelPrefix,
    optionLabelSufix,
    optionDescriptionPrefix,
    optionDescriptionSufix,
    startDatePrefix,
    endDatePrefix,
    constituentsPrefix,
    authorPrefix,
    discussionPrefix,
  } = config;

  let description: string = '';
  let optionLabels: string[] = [];
  let optionDescriptions: string[] = [];
  let options: any[] = [];
  let startTime: Date = null;
  let endTime: Date = null;
  let constituents = [];

  const parts = issue.split(sectionSeparator);

  if (parts.length !== 3) {
    console.log('error parsing description');
    throw Error('error parsing description');
  }
  description = parts[0];

  let re = new RegExp(`^(${descriptionPrefix})`);
  description = description.replace(re, '');

  re = new RegExp(`(${descriptionSufix})$`);
  description = description.replace(re, '');

  description = description.trim();

  re = new RegExp(`${optionLabelPrefix}(.*?)${optionLabelSufix}`, 'g');
  const optionLabelsArr = parts[1].match(re);

  optionLabelsArr.forEach((optionLabelItem) => {
    re = new RegExp(`^(${optionLabelPrefix})`);
    let optionLabel = optionLabelItem.replace(re, '');

    re = new RegExp(`(${optionLabelSufix})$`);
    optionLabel = optionLabel.replace(re, '');

    optionLabel = optionLabel.trim();
    optionLabels.push(optionLabel);
  });

  re = new RegExp(
    `${optionDescriptionPrefix}(.*?)${optionDescriptionSufix}`,
    'g',
  );
  const optionDescriptionsArr = parts[1].match(re);

  optionDescriptionsArr.forEach((optionDescriptionItem) => {
    re = new RegExp(`^(${optionDescriptionPrefix})`);
    let optionDescription = optionDescriptionItem.replace(re, '');

    re = new RegExp(`(${optionDescriptionSufix})$`);
    optionDescription = optionDescription.replace(re, '');

    optionDescription = optionDescription.trim();
    optionDescriptions.push(optionDescription);
  });

  for (let i = 0; i < optionLabels.length; i++) {
    options.push({
      name: optionLabels[i],
      description: optionDescriptions[i],
    });
  }

  if (options.length === 0) {
    console.log('error parsing options');
    throw Error('error parsing options');
  }

  options.push({
    name: 'Abstain',
    description: '-',
  });

  const params = parts[2].trim().split('\n');
  re = new RegExp(`^(${startDatePrefix})`);
  const startTimeStr = params[0].replace(re, '').trim();
  startTime = new Date(startTimeStr);

  re = new RegExp(`^(${endDatePrefix})`);
  const endTimeStr = params[1].replace(re, '').trim();
  endTime = new Date(endTimeStr);

  re = new RegExp(`^(${constituentsPrefix})`);
  const constituentsStr = params[2]
    .replace(re, '')
    .replace(/ /g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '');
  constituents = constituentsStr.split('|');

  re = new RegExp(`^(${authorPrefix})`);
  const author = params[3]?.replace(re, '').trim();

  re = new RegExp(`^(${discussionPrefix})`);
  const discussion = params[4]?.replace(re, '').trim();

  return {
    description,
    options,
    startTime,
    endTime,
    constituents,
    author,
    discussion,
  };
};
