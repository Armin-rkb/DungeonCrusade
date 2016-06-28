using UnityEngine;
using System.Collections;

public class BackgroundLightning : MonoBehaviour {

    [SerializeField]
    private SpriteRenderer _backgroundSprite;

    [SerializeField]
    private Color[] _lightningColors;


    void Start()
    {
        InvokeRepeating("StartLightning", 1, Random.Range(10, 30));
    }

    void StartLightning()
    {
        StartCoroutine("Lightning");
    }

    IEnumerator Lightning()
    {
        SoundManager.PlayAudioClip(19);

        _backgroundSprite.color = _lightningColors[0];
        yield return new WaitForSeconds(0.025f);
        _backgroundSprite.color = _lightningColors[1];
        yield return new WaitForSeconds(0.05f);
        _backgroundSprite.color = _lightningColors[0];
        yield return new WaitForSeconds(0.085f);
        _backgroundSprite.color = _lightningColors[1];
        yield return new WaitForSeconds(0.125f);

        StopCoroutine("Lightning");
    }
}
