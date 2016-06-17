using UnityEngine;
using System.Collections;

public class SockExplosion : MonoBehaviour
{
    //Explosion Collision circle
    [SerializeField] private CircleCollider2D collider;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;

    public int playernum;

    void Start()
    {
        ExplosionSound();
        Invoke("DestroyCollider", 0.25f);
    }

    void DestroyCollider()
    {
        Destroy(collider);
    }

    void ExplosionSound()
    {
        SoundManager.PlayAudioClip(AudioData.DuckExplosion);
    }

    void Hit(GameObject player)
    {
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (transform.position - rbPlayer.transform.position).normalized;
        playerMovement.ApplyKnockback(currPosition * knockback);
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        //IgnorePlayerHit
        Physics2D.IgnoreCollision(player.GetComponent<Collider2D>(), GetComponent<Collider2D>());
    }

    void OnTriggerEnter2D(Collider2D coll)
    {
        if (coll != null)
        {
            if (coll.CompareTag(GameTags.player))
                Hit(coll.gameObject);
        }
    }
}
