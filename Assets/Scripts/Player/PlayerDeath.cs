using UnityEngine;
using System.Collections;

public class PlayerDeath : MonoBehaviour
{

    public delegate void DeathEventHandler();
    public DeathEventHandler OnPlayerDeath;

    [SerializeField] private HealthPlayer _healthPlayer;
    [SerializeField] private PlayerMovement _playerMovement;
    [SerializeField] private PlayerFlip _playerFlip;
    [SerializeField] private PlayerDetectHit _detectHit;
    [SerializeField] private PlayerWeapon _playerWeapon;
    [SerializeField] private PlayerSendShake _sendShake;

    [SerializeField] private FXManager _fxManager;
    [SerializeField] private Rigidbody2D _thisRigidBody2D;

    private BoxCollider2D[] _thisBoxCollider2D;

    int playernum;

    public int GetPlayerNumber
    {
        get { return playernum; }
    }
   
    bool death;

    public bool GetDeath
    {
        get { return death; }
    }

    void Awake()
    {
        _healthPlayer.OnPlayerDeath += StartDeath;
        playernum = _playerMovement.PlayerNumber;
        _thisBoxCollider2D = gameObject.GetComponentsInChildren<BoxCollider2D>();
    }

    void StartDeath()
    {
        StartCoroutine("RemovePlayer");
    }


    IEnumerator RemovePlayer()
    {

        if (OnPlayerDeath != null)
            OnPlayerDeath();


        yield return new WaitForSeconds(.1f);

            _playerMovement.enabled = false;
            _playerFlip.enabled = false;
            _detectHit.enabled = false;
            _sendShake.enabled = false;
            _healthPlayer.enabled = false;
            _playerWeapon.enabled = false;

            foreach (BoxCollider2D collider2d in _thisBoxCollider2D)
                collider2d.gameObject.tag = GameTags.dead;

            _thisRigidBody2D.constraints = RigidbodyConstraints2D.FreezePositionX;
            _thisRigidBody2D.constraints = RigidbodyConstraints2D.FreezeRotation;
            
            yield return new WaitForSeconds(2);

            _fxManager.PlayFX(0, transform.position);

            _healthPlayer.OnPlayerDeath -= StartDeath;

            Destroy(this.gameObject);
    }
}
