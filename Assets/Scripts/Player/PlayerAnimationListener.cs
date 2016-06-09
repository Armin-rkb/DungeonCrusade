using UnityEngine;
using System.Collections;

public class PlayerAnimationListener : MonoBehaviour {

    [SerializeField]
    private StoneHolder _stoneHolder;
    [SerializeField]
    private PillHolder _pillHolder;
    [SerializeField]
    private ShurikenHolder _shurikenHolder;
    [SerializeField]
    private BarrelHolder _barrelHolder;
    [SerializeField]
    private PizzaHolder _pizzaHolder;
    [SerializeField]
    private SockHolder _sockHolder;
    [SerializeField]
    private DuckHolder _duckHolder;

    [SerializeField]
    private HadoukenHolder _hadoukenHolder;

    [SerializeField]
    private MusicNoteHolder _musicNoteHolder;

    bool _normalAttack;

    public bool GetNormalAttack
    {
        get { return _normalAttack; }
    }

    bool _hadoukenAttack;

    public bool GetHadoukenAttack
    {
        get { return _hadoukenAttack; }
    }

    bool _musicNoteAttack;

    public bool GetMusicNoteAttack
    {
        get { return _musicNoteAttack; }
    }



    void Awake()
    {
        _stoneHolder.OnStoneThrow += StartNormalAttack;
        _pillHolder.OnPillThrow += StartNormalAttack;
        _shurikenHolder.OnShurikenThrow += StartNormalAttack;
        _barrelHolder.OnBarrelThrow += StartNormalAttack;
        _pizzaHolder.OnPizzaThrow += StartNormalAttack;
        _sockHolder.OnSockThrow += StartNormalAttack;
        _duckHolder.OnDuckThrow += StartNormalAttack;

        _hadoukenHolder.OnHadoukenShoot += StartHadoukenAttack;
        _musicNoteHolder.OnMusicNoteShoot += StartMusicAttack;
    }

    void StartNormalAttack()
    {
        StartCoroutine("NormalAttack");
    }

    void StartHadoukenAttack()
    {
        StartCoroutine("HadoukenAttack");
    }


    void StartMusicAttack()
    {
        StartCoroutine("MusicAttack");
    }
   
   
    IEnumerator NormalAttack()
    {
        if (!_normalAttack)
            _normalAttack = true;
   

        yield return new WaitForSeconds(0.25f);

            _normalAttack = false;
    }

    IEnumerator HadoukenAttack()
    {
        if (!_hadoukenAttack)
            _hadoukenAttack = true;


        yield return new WaitForSeconds(0.25f);

        _hadoukenAttack = false;
    }

    IEnumerator MusicAttack()
    {
        if (!_musicNoteAttack)
            _musicNoteAttack = true;


        yield return new WaitForSeconds(0.5f);

        _musicNoteAttack = false;
    }
}
